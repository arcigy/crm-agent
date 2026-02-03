/**
 * Phone number normalization utilities
 */

export const normalizeSlovakPhone = (phone: string): string => {
    const cleaned = phone.replace(/\s+/g, '').trim();
    if (!cleaned) return '';
    
    // Handle double zero international prefix
    if (cleaned.startsWith('00')) {
        return '+' + cleaned.slice(2);
    }
    
    // Handle single zero local prefix (Slovakia)
    if (cleaned.startsWith('0')) {
        return '+421' + cleaned.slice(1);
    }
    
    return cleaned;
};
