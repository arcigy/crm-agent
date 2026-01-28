'use client';

import * as React from 'react';

// Comprehensive country code detection
export const getCountryFlag = (phone: string | undefined): { code: string; name: string } => {
    if (!phone) return { code: 'unknown', name: 'Unknown' };

    const p = phone.replace(/[\s\-\(\)]/g, '');

    if (p.startsWith('09') || p.startsWith('04') || p.startsWith('+421') || p.startsWith('00421')) {
        return { code: 'sk', name: 'Slovakia' };
    }

    if (p.startsWith('+420') || p.startsWith('00420')) return { code: 'cz', name: 'Czechia' };
    if (p.startsWith('+43') || p.startsWith('0043')) return { code: 'at', name: 'Austria' };
    if (p.startsWith('+49') || p.startsWith('0049')) return { code: 'de', name: 'Germany' };
    if (p.startsWith('+1') || p.startsWith('001')) return { code: 'us', name: 'USA' };
    if (p.startsWith('+44') || p.startsWith('0044')) return { code: 'gb', name: 'UK' };
    if (p.startsWith('+48') || p.startsWith('0048')) return { code: 'pl', name: 'Poland' };
    if (p.startsWith('+36') || p.startsWith('0036')) return { code: 'hu', name: 'Hungary' };
    return { code: 'unknown', name: 'Unknown' };
};

export function FlagBadge({ phone }: { phone: string | undefined }) {
    const flag = getCountryFlag(phone);

    if (flag.code === 'unknown') {
        return (
            <div className="flex items-center gap-1.5" title="Unknown">
                <div className="w-5 h-3.5 rounded-sm bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] text-gray-400 font-bold">?</div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">??</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group/flag" title={flag.name}>
            <div className="w-5 h-3.5 rounded-sm overflow-hidden shadow-sm border border-gray-200 flex shrink-0">
                <img
                    src={`https://flagcdn.com/w40/${flag.code.toLowerCase()}.png`}
                    width="20"
                    alt={flag.name}
                    className="w-full h-full object-cover"
                />
            </div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{flag.code}</span>
        </div>
    );
}
