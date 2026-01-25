'use client';

import * as React from 'react';

export function ErrorState({ errorMsg }: { errorMsg: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-red-50 border-2 border-red-100 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500 opacity-20"></div>
            <div className="w-24 h-24 bg-white shadow-2xl rounded-full flex items-center justify-center mb-6 border border-red-50">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Database Link Failure</h3>
            <p className="text-red-600 max-w-sm font-bold uppercase text-xs tracking-widest opacity-70 mb-8">{errorMsg}</p>
            <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-black transition-all"
            >
                Re-initialize Engine
            </button>
        </div>
    );
}
