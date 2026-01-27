export default function DashboardLoading() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="flex flex-col items-center gap-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">CRM Intelligence</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Načítavam dáta z cloudu...</p>
            </div>
        </div>
    );
}
