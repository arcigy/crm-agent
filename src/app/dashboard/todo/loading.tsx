import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-[60vh] flex flex-col gap-4 items-center justify-center p-10 animate-in fade-in duration-500">
        <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-violet-500 animate-[spin_1.5s_linear_infinite]" />
        <span className="text-[10px] md:text-[12px] uppercase font-black tracking-widest text-zinc-500 dark:text-zinc-600 animate-pulse">
            Sprístupňujem dáta...
        </span>
    </div>
  );
}
