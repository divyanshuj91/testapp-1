// Badge System for Civic Loop
// Defines all achievement badges and eligibility logic

export const BADGES = {
    FIRST_STEPS: {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Submit your first report',
        icon: '🎯',
        criteria: { reportsCount: 1 }
    },
    REPORTER: {
        id: 'reporter',
        name: 'Reporter',
        description: 'Submit 10 reports',
        icon: '📝',
        criteria: { reportsCount: 10 }
    },
    CIVIC_HERO: {
        id: 'civic_hero',
        name: 'Civic Hero',
        description: 'Submit 50 reports',
        icon: '🦸',
        criteria: { reportsCount: 50 }
    },
    LEGEND: {
        id: 'legend',
        name: 'Legend',
        description: 'Submit 100 reports',
        icon: '👑',
        criteria: { reportsCount: 100 }
    },
    WEALTHY: {
        id: 'wealthy',
        name: 'Wealthy',
        description: 'Earn 100 credits',
        icon: '💰',
        criteria: { totalCreditsEarned: 100 }
    },
    RICH: {
        id: 'rich',
        name: 'Rich',
        description: 'Earn 500 credits',
        icon: '💎',
        criteria: { totalCreditsEarned: 500 }
    },
    TYCOON: {
        id: 'tycoon',
        name: 'Tycoon',
        description: 'Earn 1000 credits',
        icon: '🏆',
        criteria: { totalCreditsEarned: 1000 }
    },
    WEEK_WARRIOR: {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        criteria: { streak: 7 }
    }
};

/**
 * Check which badges a user is eligible for based on their stats
 * @param {Object} userStats - User statistics object
 * @param {number} userStats.reportsCount - Total reports submitted
 * @param {number} userStats.totalCreditsEarned - Total credits earned (not current balance)
 * @param {number} userStats.streak - Current streak in days
 * @param {Array} currentBadges - Array of badge IDs user already has
 * @returns {Array} Array of newly earned badge objects
 */
export function checkBadgeEligibility(userStats, currentBadges = []) {
    const newBadges = [];

    for (const badge of Object.values(BADGES)) {
        // Skip if user already has this badge
        if (currentBadges.includes(badge.id)) continue;

        // Check if user meets criteria
        let eligible = true;
        for (const [key, value] of Object.entries(badge.criteria)) {
            if (!userStats[key] || userStats[key] < value) {
                eligible = false;
                break;
            }
        }

        if (eligible) {
            newBadges.push(badge);
        }
    }

    return newBadges;
}

/**
 * Get badge object by ID
 * @param {string} badgeId - Badge ID
 * @returns {Object|null} Badge object or null if not found
 */
export function getBadgeById(badgeId) {
    return Object.values(BADGES).find(b => b.id === badgeId) || null;
}

/**
 * Get all badges as array
 * @returns {Array} Array of all badge objects
 */
export function getAllBadges() {
    return Object.values(BADGES);
}
