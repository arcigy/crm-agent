"use client";

import * as React from "react";
import { toast } from "sonner";
import { readStreamableValue } from "@ai-sdk/rsc";
import {
  chatWithAgent,
  getAgentChats,
  saveAgentChat,
} from "@/app/actions/agent";
import type { AgentChat as AgentChatType } from "@/app/actions/agent-types";
import { useRouter } from "next/navigation";
import {
  Message,
  CostInfo,
} from "@/components/dashboard/agent/AgentChatMessage";

export function useAgentChat() {
  const router = useRouter();
  const [chatId, setChatId] = React.useState<string>("");
  const [chatList, setChatList] = React.useState<AgentChatType[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalSessionCost, setTotalSessionCost] = React.useState(0);
  const [expandedLogs, setExpandedLogs] = React.useState<
    Record<number, boolean>
  >({});

  const fetchChats = async () => {
    const list = await getAgentChats();
    setChatList(list);
  };

  React.useEffect(() => {
    setChatId(crypto.randomUUID());
    fetchChats();
  }, []);

  const toggleLog = (idx: number) => {
    setExpandedLogs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    const assistantPlaceholder: Message = {
      role: "assistant",
      content: "Antigravity analyzuje...",
      toolResults: [],
      thoughts: { intent: "Analyzujem...", plan: [], extractedData: {} },
    };

    const history = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      const isNewChat = history.length <= 2;
      const finalTitle = isNewChat
        ? userMessage.content.slice(0, 30)
        : "Nová konverzácia";

      const savedId = await saveAgentChat(chatId, finalTitle, history);
      const effectiveChatId = savedId || chatId;

      if (savedId && savedId !== chatId) {
        setChatId(savedId);
        await fetchChats();
      } else {
        fetchChats();
      }

      const { stream } = await chatWithAgent(
        history.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      );

      let finalMessages: Message[] = [];
      for await (const val of readStreamableValue(stream)) {
        setMessages((prev) => {
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;

          const costInfo: CostInfo | undefined = val?.costTracking
            ? {
                totalCost: val.costTracking.totalCost || 0,
                inputTokens: val.costTracking.totalInputTokens || 0,
                outputTokens: val.costTracking.totalOutputTokens || 0,
                breakdown: val.costTracking.breakdown,
              }
            : undefined;

          if (costInfo) {
            setTotalSessionCost((prev) => prev + costInfo.totalCost);
          }

          newMsgs[lastIdx] = {
            role: "assistant",
            content:
              val?.content ||
              (val?.status === "thinking" ? "Antigravity pracuje..." : ""),
            toolResults: val?.toolResults || [],
            thoughts: val?.thoughts || assistantPlaceholder.thoughts,
            costInfo,
          };
          finalMessages = newMsgs;
          return newMsgs;
        });
      }

      saveAgentChat(effectiveChatId, finalTitle, finalMessages)
        .then(() => fetchChats())
        .catch((err) => console.error("Persistence Error:", err));

      // 🚨 AUTOMATIC REDIRECTS: If any tool result has an 'action' field, handle it
      const lastAssistantMsg = finalMessages[finalMessages.length - 1];
      if (lastAssistantMsg?.toolResults) {
        const redirectTool = lastAssistantMsg.toolResults.find(
          (step) => (step.result as any)?.action === "open_url" && (step.result as any)?.url,
        );

        if (redirectTool) {
          const result = redirectTool.result as any;
          toast.success(result.message || "Presmerovávam...", {
            icon: "🚀",
            duration: 3000,
          });
          
          // Give user a second to read the message
          setTimeout(() => {
            router.push(result.url);
          }, 1500);
        }
      }
    } catch (err) {
      toast.error(
        "Chyba spojenia: " + (err instanceof Error ? err.message : String(err)),
      );
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    setChatId(crypto.randomUUID());
    setTotalSessionCost(0);
    setMessages([
      { role: "assistant", content: "Nová misia začína. Ako ti pomôžem?" },
    ]);
  };

  const loadChat = (chat: AgentChatType) => {
    setChatId(chat.id);
    const msgs = chat.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    setMessages(msgs);
  };

  const copyMessagesToClipboard = () => {
    const data = JSON.stringify(messages, null, 2);
    navigator.clipboard.writeText(data);
    toast.success("Debug dáta skopírované!");
  };

  return {
    chatId,
    chatList,
    messages,
    input,
    setInput,
    isLoading,
    totalSessionCost,
    expandedLogs,
    toggleLog,
    handleSend,
    createNewChat,
    loadChat,
    copyMessagesToClipboard,
  };
}
