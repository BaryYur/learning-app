import { useState } from "react";

import { openai } from "../vars/openai.ts";

const apiKey = import.meta.env.VITE_OPEN_AI_API_KEY;

export const Conversation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);

  // @ts-ignore
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  // add the last bot text to the assignments

  recognition.lang = "en-US";
  recognition.interimResults = false;

  const startListening = () => {
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognition.stop();
    setIsListening(false);
  };

  recognition.onresult = async (event: any) => {
    const lastResultIndex = event.results.length - 1;
    const transcript = event.results[lastResultIndex][0].transcript;

    if (event.results[lastResultIndex].isFinal) {
      await addQuestion(transcript);
    }
  };

  recognition.onend = () => {
    if (isListening) {
      // recognition.start();
    }
  };

  const addQuestion = async (message: string) => {
    setIsLoading(true);

    setMessages((prevMessages) => {
      return [...prevMessages, { role: "user", content: message }];
    });

    try {
      const response = await openai.chat.completions.create(
        {
          messages: [...messages, { role: "user", content: message }],
          model: "gpt-4o-mini",
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          }
        }
      );

      const botMessage = { role: "assistant", content: response.choices[0].message.content };

      setMessages((prevMessages) => [...prevMessages, botMessage]);

      speak(botMessage.content ?? "");
      // console.log(response);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="w-full text-left h-[100dvh] justify-between md:w-[700px] md:m-auto">
      <div>
        <p className="font-semibold text-center text-[18px]">Conversation</p>

        {messages.length > 0 ? (
          <div className="flex justify-between h-[calc(100dvh-111px)] overflow-y-auto">
            <ul className="flex gap-[10px] flex-col w-full py-[10px] px-[15px]">
              {messages.map((msg, index) => (
                <li
                  key={index}
                  className={`${msg.role === "user" ? "justify-end" : "justify-start"} flex`}
                >
                  <div className="max-w-[80%] p-[12px] bg-gray-200 rounded-[8px]">
                    {msg.content}
                  </div>
                </li>
              ))}

              {isLoading && <span className="text-center">Loading...</span>}
            </ul>
          </div>
        ) : (
          <div className="h-[calc(100dvh-111px)] flex items-center justify-center">
            <p className="text-center text-gray-700">Start talk</p>
          </div>
        )}
      </div>

      <div className="py-[10px]">
        <button
          onClick={isListening ? stopListening : startListening}
          className="m-auto block mt-[20px] py-[6px] px-[10px] bg-gray-800 text-white rounded-[8px]"
        >
          {isListening ? "Stop" : "Speak"}
        </button>
      </div>
    </div>
  );
};