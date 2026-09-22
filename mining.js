import { cfg, TIERS } from './config.js';

/* =========================================================
   ASTRA MINING — Mining Engine
   ========================================================= */

export function getAgentPower(agent) {
    const tier = TIERS[agent.tier] || TIERS.starter;
    return tier.basePower * (1 + (agent.level - 1) * 0.25);
}

export function getTotalPower(agents) {
    return agents.reduce((s, a) => s + getAgentPower(a), 0);
}

export function getAgentUpgradeCost(agent) {
    const base = TIERS[agent.tier]?.cost || 5;
    return base * 0.8 * Math.pow(cfg.UPGRADE_COST_MULT, agent.level - 1);
}

/**
 * Offline catch-up hesabı
 * Sürekli mining (çok düşük) + cycle tamamlanma bonusu
 */
export function catchUp(user, agents) {
    const now = Date.now();
    const lastTick = user.last_tick || now;
    const elapsed = Math.max(0, Math.floor((now - lastTick) / 1000));

    if (elapsed === 0) {
        return {
            tokens: user.tokens,
            totalMined: user.total_mined,
            remaining: user.remaining ?? cfg.CYCLE_SECONDS,
            lastTick: now,
            cyclesCompleted: 0,
            cycleRewards: [],
        };
    }

    const power = getTotalPower(agents);
    const perSecond = (power * cfg.MINING_RATE_PER_POWER) / 3600;

    let tokens = user.tokens + elapsed * perSecond;
    let totalMined = user.total_mined + elapsed * perSecond;
    let remaining = (user.remaining ?? cfg.CYCLE_SECONDS) - elapsed;

    const cycleRewards = [];
    let safety = 0;
    while (remaining <= 0 && safety < 500) {
        const reward = power * cfg.CYCLE_REWARD_MULT;
        tokens += reward;
        totalMined += reward;
        remaining += cfg.CYCLE_SECONDS;
        cycleRewards.push(reward);
        safety++;
    }

    return {
        tokens, totalMined, remaining, lastTick: now,
        cyclesCompleted: cycleRewards.length,
        cycleRewards,
    };
}

export function calcReferralBonus(earnedAmount) {
    return earnedAmount * cfg.REFERRAL_PERCENT;
}

export function tokenToUsd(tokens) { return tokens * cfg.TOKEN_TO_USD; }
export function usdToToken(usd)    { return usd / cfg.TOKEN_TO_USD; }