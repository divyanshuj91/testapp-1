// Input Sanitization Utility
// Prevents XSS (Cross-Site Scripting) attacks

/**
 * Sanitize HTML input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized string safe for display
 */
export function sanitizeHTML(input) {
    if (!input) return '';

    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Sanitize input for use in Firebase (removes dangerous characters)
 * @param {string} input - User input
 * @returns {string} Sanitized string
 */
export function sanitizeForDatabase(input) {
    if (!input) return '';

    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (basic)
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

/**
 * Limit string length
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated string
 */
export function limitLength(input, maxLength = 500) {
    if (!input) return '';
    return input.substring(0, maxLength);
}

/**
 * Check for spam patterns
 * @param {string} text - Text to check
 * @returns {boolean} True if spam detected
 */
export function isSpam(text) {
    if (!text) return false;

    const spamPatterns = [
        /(.)\1{10,}/i, // Repeated characters
        /http[s]?:\/\/.*http[s]?:\/\//i, // Multiple URLs
        /\b(viagra|cialis|casino|lottery)\b/i, // Common spam words
    ];

    return spamPatterns.some(pattern => pattern.test(text));
}
