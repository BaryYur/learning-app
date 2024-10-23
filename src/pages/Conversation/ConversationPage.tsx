import { useEffect, useRef, useCallback, useState } from "react";

import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { WavRecorder, WavStreamPlayer } from "../../lib/wavtools/index.js";
import { instructions } from "../../utils/conversation_config.js";

import PauseIcon from "../../assets/icons/pause-icon.svg";
import MicrophoneIcon from "../../assets/icons/microphone-light.svg";
import CrossIconWhite from "../../assets/icons/cross-icon-white.svg";

interface RealtimeEvent {
  time: string;
  source: "client" | "server";
  count?: number;
  event: { [key: string]: any };
}

const apiKey = import.meta.env.VITE_OPEN_AI_API_KEY;

export const ConversationPage = () => {
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient({
      apiKey: apiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
    })
  );

  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    client.updateSession({ turn_detection: { type: "server_vad" } });
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    await wavRecorder.begin();

    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    // client.sendUserMessageContent([
    //   {
    //     type: `input_text`,
    //     text: `Hello!`,
    //   },
    // ]);

    if (client.getTurnDetectionType() === "server_vad") {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    // setRealtimeEvents([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;

    await wavStreamPlayer.interrupt();
  }, []);

  // const deleteConversationItem = useCallback(async (id: string) => {
  //   const client = clientRef.current;
  //   client.deleteItem(id);
  // }, []);

  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;

      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll("[data-conversation-content]")
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set instructions
    client.updateSession({ instructions: instructions });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    // handle realtime events from client + server for event logging
    client.on("realtime.event", (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          // if we receive multiple events in a row, aggregate them for display purposes
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on("error", (event: any) => console.error(event));
    client.on("conversation.interrupted", async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();

      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;

        await client.cancelResponse(trackId, offset);
      }
    });
    client.on("conversation.updated", async ({ item, delta }: any) => {
      const items = client.conversation.getItems();

      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }

      if (item.status === "completed" && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }

      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      client.reset();
    };
  }, []);

  return (
    <div
      data-component="ConsolePage"
      className="flex flex-col justify-between h-[100vh] w-full m-auto"
    >
      <div>
        <div className="p-[20px] border-b-[1px] ">
          <h2 className="text-center text-[20px]">AI Assistant</h2>
        </div>

        {/*{!isConnected ? (*/}
          <div className="max-h-[calc(100dvh-160px)] overflow-y-auto px-[20px] w-full m-auto md:w-[700px]">
            {!items.length && (
              <div className="h-[calc(100dvh-165px)] flex items-center justify-center">
                <p>Start talk</p>
              </div>
            )}

            {items.length > 0 && <div>
              <div className="py-[10px] h-[calc(100dvh-165px)] flex flex-col gap-[15px]" data-conversation-content>
                {items.map((conversationItem, i) => {
                  return (
                    <div className={`${conversationItem.role === "user" && "justify-end"} flex`} key={conversationItem.id}>
                      <div className="max-w-[80%] flex flex-col gap-[8px]">
                        <div>
                          <div className={`${conversationItem.role === "user" && "justify-end"} flex`}>
                            <span className="border-[1px] bg-gray-200 p-[10px] rounded-[8px]">
                              {(
                                conversationItem.role || conversationItem.type
                              ).replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-300 rounded-[10px] p-[8px]">
                          {/* tool response */}
                          {conversationItem.type === 'function_call_output' && (
                            <div>{conversationItem.formatted.output}</div>
                          )}
                          {/* tool call */}
                          {!!conversationItem.formatted.tool && (
                            <div>
                              {conversationItem.formatted.tool.name}(
                              {conversationItem.formatted.tool.arguments})
                            </div>
                          )}
                          {!conversationItem.formatted.tool &&
                            conversationItem.role === 'user' && (
                              <div className="bg-red">
                                {conversationItem.formatted.transcript ||
                                  (conversationItem.formatted.audio?.length
                                    ? '(awaiting transcript)'
                                    : conversationItem.formatted.text ||
                                    '(item sent)')}
                              </div>
                            )}
                          {!conversationItem.formatted.tool &&
                            conversationItem.role === 'assistant' && (
                              <div>
                                {conversationItem.formatted.transcript ||
                                  conversationItem.formatted.text ||
                                  '(truncated)'}
                              </div>
                            )}
                        </div>

                        {conversationItem.formatted.file && (
                          <audio
                            src={conversationItem.formatted.file.url}
                            controls
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}
          </div>
        {/*) : (*/}
        {/*   <div className="h-[calc(100dvh-160px)] flex items-center justify-center">*/}
        {/*     <p>talk effect</p>*/}
        {/*   </div>*/}
        {/*)}*/}
      </div>

      <div
        className={`
          ${!isConnected ? "justify-end" : "justify-start"}
          flex items-end min-h-[90px] pt-[30px]
          pb-[20px] relative z-0 px-[20px]
          w-full m-auto md:w-[700px] md:px-0
        `}
      >
        {isConnected && (
          <button
            className="relative z-[2] bg-main-red p-[12px] rounded-[50%]"
            onClick={disconnectConversation}
          >
            <img src={`${CrossIconWhite}`} alt="close"/>
          </button>
        )}

        <div className="absolute top-[0] w-[calc(100%-20px)] z-[1] flex justify-center md:w-[calc(100%)]">
          <button
            className={`${!isConnected && "border-[1px]"} rounded-[50%] bg-white p-[10px]`}
            style={{ boxShadow: isConnected ? "5px 4px 20px 0px rgba(0, 0, 0, 0.13)" : "" }}
            onClick={isConnected ? disconnectConversation : connectConversation}
          >
            {isConnected ? <img src={`${PauseIcon}`} alt="pause" /> : <img src={`${MicrophoneIcon}`} alt="microphone" />}
          </button>
        </div>

        {items.length !== 0 && !isConnected && (
          <div className="self-end">Assign</div>
        )}
      </div>
    </div>
  );
}