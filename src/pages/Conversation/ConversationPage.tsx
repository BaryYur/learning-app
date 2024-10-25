import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useContext,
} from "react";

import { RealtimeClient } from "@openai/realtime-api-beta";
// @ts-ignore
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
// @ts-ignore
import { WavRecorder, WavStreamPlayer } from "../../lib/wavtools/index.js";
// @ts-ignore
import { teacherInstructions } from "../../utils/conversation_config.js";

import { Link } from "react-router-dom";

import TeacherConversationsContext from "../../context/teacher-conversations.tsx";

import { Modal, Button } from "../../components";

import PauseIcon from "../../assets/icons/pause-icon.svg";
import MicrophoneIcon from "../../assets/icons/microphone-light.svg";
import CrossIconWhite from "../../assets/icons/cross-icon-white.svg";
import LeftArrowIcon from "../../assets/icons/left-arrow.svg";

// import { openai } from "../../vars/open-ai.ts";

interface RealtimeEvent {
  time: string;
  source: "client" | "server";
  count?: number;
  event: { [key: string]: any };
}

const apiKey = import.meta.env.VITE_OPEN_AI_API_KEY;

export const ConversationPage = () => {
  const { addTeacherTask } = useContext(TeacherConversationsContext);

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

  const [isAssignmentCreated, setIsAssignmentCreated] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  // const [summary, setSummary] = useState("");

  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    client.defaultSessionConfig = {
      modalities: ["text", "audio"],
      instructions: "Please communicate in English only.",
      voice: "en-US",
    };
    client.updateSession({ turn_detection: { type: "server_vad" } });

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
    //     text: `create an assignment for learning basics of react js`,
    //   },
    // ]);

    if (client.getTurnDetectionType() === "server_vad") {
      await wavRecorder.record((data: any) => client.appendInputAudio(data.mono));
    }
  }, []);

  // for teacher role
  // const generateSummary = async () => {
  //   try {
  //     const conversationItems = [...items];
  //
  //     console.log('gen for items', items);
  //
  //     const conversationText = conversationItems
  //       .map(item => `${item.role}: ${item.formatted.text || item.formatted.transcript || ''}`)
  //       .join('\n');
  //
  //     const completion = await openai.chat.completions.create({
  //       messages: [
  //         {
  //           role: "system",
  //           content: "You are an AI assistant. You need to determine if there is enough, generate the summary and assignment; otherwise, indicate what additional information is needed."
  //         },
  //         {
  //           role: "user",
  //           content: `Based on the following conversation, determine if there is enough information to generate a summary and assignment:\n\n${conversationText}`
  //         }
  //       ],
  //       model: "gpt-4o-mini",
  //     });
  //
  //     const generatedSummary = completion.choices[0]?.message?.content || "No response generated.";
  //
  //     setSummary(generatedSummary);
  //     setIsAssignmentCreated(true);
  //   } catch (error) {
  //     console.error('Failed to generate summary:', error);
  //   }
  // };

  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);

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
    client.updateSession({ instructions: teacherInstructions });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: "whisper-1" } });

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

    client.on("error", (event: any) => {
      console.error(event);
    });

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
      <div className="pt-[100px]">
        <div className="p-[20px] border-b-[1px] fixed z-[1] top-0 w-full bg-white">
          <div className="absolute top-[20px] left-[20px]">
            <Link to="/teacher-tasks">
              <img src={`${LeftArrowIcon}`} />
            </Link>
          </div>
          <h2 className="text-center text-[20px]">AI Assistant</h2>
        </div>

        {!isConnected ? (
          <div className="px-[20px] pb-[200px] w-full m-auto md:w-[700px]">
            {items.length === 0 && (
              <div className="h-[calc(100dvh-340px)] flex items-center justify-center">
                <p>Start talk</p>
              </div>
            )}

            {items.length > 0 && <div>
              <div className="py-[10px] flex flex-col gap-[15px]" data-conversation-content>
                {items.map((conversationItem) => {
                  return (
                    <div className={`${conversationItem.role === "user" && "justify-end"} flex`} key={conversationItem.id}>
                      <div className="max-w-[90%] flex flex-col gap-[8px]">
                        <div>
                          <div className={`${conversationItem.role === "user" && "justify-end"} flex`}>
                            <span className="border-[1px] bg-gray-200 p-[10px] rounded-[8px]">
                              {(
                                conversationItem.role || conversationItem.type
                              )}
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

                        {/*{conversationItem.formatted.file && (*/}
                        {/*  <audio*/}
                        {/*    src={conversationItem.formatted.file.url}*/}
                        {/*    controls*/}
                        {/*  />*/}
                        {/*)}*/}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}

            {/*{summary !== "" && <p className="border-[1px] bg-gray-200 p-[10px] rounded-[8px]">{summary}</p>}*/}
          </div>
        ) : (
           <div className="flex items-center justify-center">
             <p>Conversation</p>
           </div>
        )}
      </div>

      <div
        className={`
          ${!isConnected ? "justify-end" : "justify-start"}
          flex items-end min-h-[90px] pt-[30px]
          pb-[20px] fixed bottom-0 z-0 px-[20px]
          w-full bg-white
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

        <div className="absolute top-[0] left-[10px] w-[calc(100%-20px)] z-[1] flex justify-center">
          <button
            className={`${!isConnected && "border-[1px]"} rounded-[50%] bg-white p-[10px] w-[77.6px] h-[77.6px]`}
            style={{
              boxShadow: isConnected ? "5px 4px 20px 0px rgba(0, 0, 0, 0.13)" : "",
              backgroundImage: isConnected ? `url(${PauseIcon})` : `url(${MicrophoneIcon})`,
              backgroundPositionX: "center",
              backgroundPositionY: "center",
              backgroundRepeat: "no-repeat",
            }}
            onTouchStart={connectConversation}
            onTouchEnd={disconnectConversation}
          />
        </div>

        {items.length > 1 && !isConnected && (
          <div className="self-end relative z-[2]" >
            <Button
              className="text-main-red border-main-red px-[22px] hover:bg-main-red hover:text-white"
              onClick={() => setIsAssignmentModalOpen(true)}
            >
              Assign
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
      >
        <p className="text-center font-semibold text-[18px] text-dark-blue">Assignment</p>

        <div className="flex flex-col gap-[10px] pt-[20px]">
          <label>Assignment details</label>

          <p className="flex gap-[10px]">
            <span className="text-gray-500">Deadline:</span>
            <span>12/12/1222</span>
          </p>

          <div className="flex justify-center">
            <Button
              className="bg-main-red text-white w-full border-main-red sm:w-[120px] "
              onClick={() => {
                addTeacherTask("some title");
                setIsAssignmentModalOpen(false);
              }}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};