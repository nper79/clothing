import { supabase, isSupabaseReady, markSupabaseAuthUnavailable } from './supabaseService';
import type {
    UserProfile,
    PreferenceWeights,
    AttributeRejection,
    FeedbackReason,
    OutfitAnalysis,
    UserFeedback,
    Answers
} from '../types';

// Monthly decay rate for preference weights
const MONTHLY_DECAY_RATE = 0.98;
const HARD_BAN_THRESHOLD = 3; // consecutive rejections for hard ban
const COOLDOWN_DAYS = 7; // days to avoid showing rejected items

const RESERVED_WEIGHT_KEYS = {
    STYLE_VECTOR: '__styleVector',
    LIKED_COLORS: '__likedColors',
    DISLIKED_COLORS: '__dislikedColors'
} as const;

const RESERVED_WEIGHT_KEY_SET = new Set<string>(Object.values(RESERVED_WEIGHT_KEYS));

const DEFAULT_STYLE_VECTOR = {
    formality: 0.5,
    color_neutrality: 0.5,
    comfort: 0.5,
    trendiness: 0.5,
    minimalism: 0.5
};

export class PreferenceServiceSupabase {
    private static isValidUuid(value: string | null | undefined): value is string {
        return typeof value === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }

    private static canSync(userId: string): boolean {
        return isSupabaseReady() && this.isValidUuid(userId);
    }

    private static ensureArray<T>(value: any, fallback: T[] = []): T[] {
        return Array.isArray(value) ? value : fallback;
    }

    private static isAuthError(error: any): boolean {
        if (!error) return false;
        const status = Number(error.status ?? error?.response?.status);
        if (status === 401 || status === 403) {
            return true;
        }
        const codeRaw = error.code ?? error.status ?? '';
        const codeString = typeof codeRaw === 'string' ? codeRaw : String(codeRaw);
        if (codeString.includes('401') || codeString.includes('403') || codeString.includes('42501')) {
            return true;
        }
        if (typeof error.message === 'string') {
            const msg = error.message.toLowerCase();
            if (msg.includes('authorization') || msg.includes('unauthorized') || msg.includes('row-level security') || msg.includes('permission denied')) {
                return true;
            }
        }
        return false;
    }

    private static handleSupabaseError(error: any): boolean {
        if (!this.isAuthError(error)) {
            return false;
        }
        markSupabaseAuthUnavailable();
        return true;
    }

    private static nowIso(): string {
        return new Date().toISOString();
    }

    private static isoToEpochSeconds(value: string | null | undefined): number | null {
        if (!value) return null;
        const timestamp = Date.parse(value);
        if (Number.isNaN(timestamp)) {
            return null;
        }
        return Math.floor(timestamp / 1000);
    }

    private static epochSecondsToIso(value: number | null | undefined): string {
        if (value === null || value === undefined) {
            return this.nowIso();
        }
        return new Date(value * 1000).toISOString();
    }

    private static serializePreferenceWeights(profile: UserProfile): Record<string, any> {
        return {
            [RESERVED_WEIGHT_KEYS.STYLE_VECTOR]: profile.style_vector,
            [RESERVED_WEIGHT_KEYS.LIKED_COLORS]: profile.liked_colors,
            [RESERVED_WEIGHT_KEYS.DISLIKED_COLORS]: profile.disliked_colors,
            ...profile.preferenceWeights
        };
    }

    private static deserializePreferenceWeights(payload: any): {
        styleVector: typeof DEFAULT_STYLE_VECTOR;
        likedColors: string[];
        dislikedColors: string[];
        weights: PreferenceWeights;
    } {
        if (!payload || typeof payload !== 'object') {
            return {
                styleVector: { ...DEFAULT_STYLE_VECTOR },
                likedColors: [],
                dislikedColors: [],
                weights: {}
            };
        }

        const styleVector = payload[RESERVED_WEIGHT_KEYS.STYLE_VECTOR] && typeof payload[RESERVED_WEIGHT_KEYS.STYLE_VECTOR] === 'object'
            ? { ...DEFAULT_STYLE_VECTOR, ...(payload[RESERVED_WEIGHT_KEYS.STYLE_VECTOR] as Partial<typeof DEFAULT_STYLE_VECTOR>) }
            : { ...DEFAULT_STYLE_VECTOR };

        const likedColors = this.ensureArray<string>(payload[RESERVED_WEIGHT_KEYS.LIKED_COLORS], []);
        const dislikedColors = this.ensureArray<string>(payload[RESERVED_WEIGHT_KEYS.DISLIKED_COLORS], []);

        const weights: PreferenceWeights = {};
        Object.entries(payload).forEach(([key, value]) => {
            if (RESERVED_WEIGHT_KEY_SET.has(key)) {
                return;
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
                weights[key] = value;
            }
        });

        return { styleVector, likedColors, dislikedColors, weights };
    }

    private static serializeRejections(profile: UserProfile) {
        return profile.rejections.map(rejection => ({
            user_id: profile.user_id,
            attr_key: `${rejection.attribute}:${rejection.value}`,
            likes: 0,
            dislikes: rejection.streak,
            streak_dislikes: rejection.streak,
            cooldown_until_session: rejection.isHardBan ? -1 : null,
            last_seen_session: this.isoToEpochSeconds(rejection.lastRejected)
        }));
    }

    private static mapAttrStatsToRejections(rows: any[]): AttributeRejection[] {
        return rows.map(row => {
            const [attribute, ...rest] = typeof row.attr_key === 'string' ? row.attr_key.split(':') : ['unknown', 'unknown'];
            return {
                attribute,
                value: rest.join(':') || 'unknown',
                streak: row.streak_dislikes ?? row.dislikes ?? 0,
                lastRejected: this.epochSecondsToIso(row.last_seen_session),
                isHardBan: row.cooldown_until_session === -1
            };
        });
    }

    private static mapBudget(budget?: string): string {
        if (!budget) return 'mid';
        const normalized = budget.toLowerCase();
        if (normalized.startsWith('low')) return 'low';
        if (normalized.startsWith('high')) return 'high';
        return 'mid';
    }

    private static ensureOutfitId(outfitId?: string): string {
        if (this.isValidUuid(outfitId)) {
            return outfitId!;
        }
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        return template.replace(/[xy]/g, (char) => {
            const rand = Math.random() * 16 | 0;
            const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
            return value.toString(16);
        });
    }

    private static getSessionCounter(): number {
        try {
            const current = parseInt(localStorage.getItem('styleai_session_counter') || '0', 10);
            const next = Number.isNaN(current) ? 1 : current + 1;
            localStorage.setItem('styleai_session_counter', next.toString());
            return next;
        } catch {
            return Math.floor(Date.now() / 1000);
        }
    }

    private static buildInitialRejections(constraints: UserProfile['onboardingConstraints']): AttributeRejection[] {
        const now = this.nowIso();
        const makeRejection = (attribute: string, value: string): AttributeRejection => ({
            attribute,
            value,
            streak: HARD_BAN_THRESHOLD,
            lastRejected: now,
            isHardBan: true
        });

        return [
            ...constraints.colorsToAvoid.map(color => makeRejection('color', color)),
            ...constraints.fitsToAvoid.map(fit => makeRejection('fit', fit)),
            ...constraints.patternsToAvoid.map(pattern => makeRejection('pattern', pattern)),
            ...constraints.itemsToAvoid.map(item => makeRejection('category', item))
        ];
    }

    private static composeUserProfile(profileRow: any, preferenceRow: any, attrRows: any[]): UserProfile {
        const { styleVector, likedColors, dislikedColors, weights } = this.deserializePreferenceWeights(preferenceRow?.weights);

        const patternBans = (attrRows || [])
            .filter((row: any) => typeof row.attr_key === 'string' && row.attr_key.startsWith('pattern:') && row.cooldown_until_session === -1)
            .map((row: any) => row.attr_key.split(':').slice(1).join(':'));

        const constraints = {
            contexts: this.ensureArray<string>(profileRow?.contexts, []),
            seasons: this.ensureArray<string>(profileRow?.seasons, []),
            budget: profileRow?.budget_tier ?? 'Medium',
            itemsToAvoid: this.ensureArray<string>(profileRow?.avoid_items, []),
            colorsToAvoid: this.ensureArray<string>(profileRow?.hard_avoid_colors, []),
            fitsToAvoid: this.ensureArray<string>(profileRow?.hard_avoid_fits, []),
            patternsToAvoid: patternBans,
            logoVisibility: profileRow?.logo_visibility ?? 'ok'
        };

        return {
            user_id: profileRow.user_id,
            style_vector: styleVector,
            liked_colors: likedColors,
            disliked_colors: dislikedColors,
            feedback_history: [],
            preferenceWeights: weights,
            rejections: this.mapAttrStatsToRejections(attrRows),
            onboardingConstraints: constraints,
            lastUpdated: profileRow?.updated_at ?? this.nowIso(),
            ageBand: profileRow?.age_band ?? undefined,
            presentingGender: profileRow?.presenting_gender ?? undefined,
            logoVisibility: profileRow?.logo_visibility ?? constraints.logoVisibility
        };
    }

    // Initialize user profile from onboarding answers
    static async initializeUserProfile(userId: string, onboardingAnswers: Answers): Promise<UserProfile> {
        const contexts = Array.isArray(onboardingAnswers.contexts) ? onboardingAnswers.contexts as string[] : [];
        const seasons = Array.isArray(onboardingAnswers.seasons) ? onboardingAnswers.seasons as string[] : [];
        const itemsToAvoid = Array.isArray(onboardingAnswers.itemsToAvoid) ? onboardingAnswers.itemsToAvoid as string[] : [];
        const colorsToAvoid = Array.isArray(onboardingAnswers.colorsToAvoid) ? onboardingAnswers.colorsToAvoid as string[] : [];
        const fitsToAvoid = Array.isArray(onboardingAnswers.fitsToAvoid) ? onboardingAnswers.fitsToAvoid as string[] : [];
        const patternsToAvoid = Array.isArray(onboardingAnswers.patternsToAvoid) ? onboardingAnswers.patternsToAvoid as string[] : [];

        const logoPreference = (onboardingAnswers.logosPreference as string) || undefined;
        const logoVisibility = logoPreference === 'Avoid logos' ? 'no_logos' : 'ok';

        const constraints = {
            contexts,
            seasons,
            budget: (onboardingAnswers.budget as string) || 'Medium',
            itemsToAvoid,
            colorsToAvoid,
            fitsToAvoid,
            patternsToAvoid,
            logoVisibility
        };

        const profile: UserProfile = {
            user_id: userId,
            style_vector: { ...DEFAULT_STYLE_VECTOR },
            liked_colors: [],
            disliked_colors: [],
            feedback_history: [],
            preferenceWeights: {},
            rejections: this.buildInitialRejections(constraints),
            onboardingConstraints: constraints,
            lastUpdated: this.nowIso(),
            ageBand: onboardingAnswers.ageRange as string | undefined,
            presentingGender: onboardingAnswers.stylePreference as string | undefined,
            logoVisibility
        };

        if (this.canSync(userId)) {
            try {
                await this.saveUserProfile(profile);
            } catch (error) {
                if (!this.handleSupabaseError(error)) {
                    console.error('Error persisting initial profile to Supabase:', error);
                }
            }
        }

        return profile;
    }

    // Load user profile from Supabase
    static async loadUserProfile(userId: string): Promise<UserProfile | null> {
        if (!this.canSync(userId)) {
            return null;
        }

        try {
            const { data: profileRow, error: profileError } = await supabase
                .from('user_profile')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (profileError) {
                if (profileError.code === 'PGRST116') {
                    return null;
                }
                if (this.handleSupabaseError(profileError)) {
                    return null;
                }
                throw profileError;
            }

            if (!profileRow) {
                return null;
            }

            const { data: preferenceRow, error: preferenceError } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (preferenceError) {
                if (this.handleSupabaseError(preferenceError)) {
                    return null;
                }
                throw preferenceError;
            }

            const { data: attrRows, error: attrError } = await supabase
                .from('user_attr_stats')
                .select('*')
                .eq('user_id', userId);

            if (attrError) {
                if (this.handleSupabaseError(attrError)) {
                    return null;
                }
                throw attrError;
            }

            return this.composeUserProfile(profileRow, preferenceRow, attrRows || []);
        } catch (error) {
            if (this.handleSupabaseError(error)) {
                return null;
            }
            console.error('Error loading user profile:', error);
            return null;
        }
    }

    // Save user profile to Supabase
    static async saveUserProfile(profile: UserProfile): Promise<void> {
        if (!this.canSync(profile.user_id)) {
            return;
        }

        try {
            const constraints = profile.onboardingConstraints || {
                contexts: [],
                seasons: [],
                budget: 'Medium',
                itemsToAvoid: [],
                colorsToAvoid: [],
                fitsToAvoid: [],
                patternsToAvoid: [],
                logoVisibility: profile.logoVisibility ?? 'ok'
            };

            const profilePayload = {
                user_id: profile.user_id,
                age_band: profile.ageBand ?? null,
                presenting_gender: profile.presentingGender ?? null,
                contexts: constraints.contexts,
                seasons: constraints.seasons,
                budget_tier: this.mapBudget(constraints.budget),
                hard_avoid_colors: constraints.colorsToAvoid,
                hard_avoid_fits: constraints.fitsToAvoid,
                avoid_items: constraints.itemsToAvoid,
                logo_visibility: profile.logoVisibility ?? constraints.logoVisibility ?? 'ok',
                updated_at: this.nowIso()
            };

            const { error: profileError } = await supabase
                .from('user_profile')
                .upsert(profilePayload, { onConflict: 'user_id' });

            if (profileError) {
                if (this.handleSupabaseError(profileError)) {
                    return;
                }
                throw profileError;
            }

            const { error: preferenceError } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: profile.user_id,
                    weights: this.serializePreferenceWeights(profile),
                    updated_at: this.nowIso()
                }, { onConflict: 'user_id' });

            if (preferenceError) {
                if (this.handleSupabaseError(preferenceError)) {
                    return;
                }
                throw preferenceError;
            }

            const serializedRejections = this.serializeRejections(profile);

            const { error: deleteError } = await supabase
                .from('user_attr_stats')
                .delete()
                .eq('user_id', profile.user_id);

            if (deleteError) {
                if (this.handleSupabaseError(deleteError)) {
                    return;
                }
                throw deleteError;
            }

            if (serializedRejections.length > 0) {
                const { error: attrError } = await supabase
                    .from('user_attr_stats')
                    .upsert(serializedRejections, { onConflict: 'user_id,attr_key' });
                if (attrError) {
                    if (this.handleSupabaseError(attrError)) {
                        return;
                    }
                    throw attrError;
                }
            }
        } catch (error) {
            if (this.handleSupabaseError(error)) {
                return;
            }
            console.error('Error saving user profile:', error);
            throw error;
        }
    }

    // Apply monthly decay to preference weights
    private static applyMonthlyDecay(weights: PreferenceWeights): PreferenceWeights {
        const decayedWeights: PreferenceWeights = {};
        const now = new Date();

        for (const [key, value] of Object.entries(weights)) {
            // Simplified decay - in production, calculate based on actual time passed
            decayedWeights[key] = value * MONTHLY_DECAY_RATE;
        }

        return decayedWeights;
    }

    // Update preference weights based on feedback
    static async updatePreferencesFromFeedback(
        profile: UserProfile,
        outfitAnalysis: OutfitAnalysis,
        feedbackType: 'like' | 'dislike',
        microReasons?: FeedbackReason[]
    ): Promise<UserProfile> {

        // Apply decay to existing weights
        profile.preferenceWeights = this.applyMonthlyDecay(profile.preferenceWeights);

        if (feedbackType === 'like') {
            // Positive reinforcement for all tags in liked outfit
            outfitAnalysis.tags.forEach(tag => {
                const key = `${tag.attribute}:${tag.value}`;
                const currentWeight = profile.preferenceWeights[key] || 0;
                const weightIncrease = tag.confidence * 0.3; // Scale by confidence

                profile.preferenceWeights[key] = Math.min(currentWeight + weightIncrease, 2.0); // Cap at 2.0
            });

        } else if (feedbackType === 'dislike' && microReasons) {
            // Negative reinforcement for specific reasons
            microReasons.forEach(reason => {
                const relevantTags = outfitAnalysis.tags.filter(tag =>
                    this.tagMatchesReason(tag, reason, outfitAnalysis.items)
                );

                relevantTags.forEach(tag => {
                    const key = `${tag.attribute}:${tag.value}`;
                    const currentWeight = profile.preferenceWeights[key] || 0;
                    const weightDecrease = tag.confidence * 0.4; // Stronger penalty for dislikes

                    profile.preferenceWeights[key] = Math.max(currentWeight - weightDecrease, -2.0); // Cap at -2.0

                    // Track rejection for progressive rejection
                    this.trackRejection(profile, tag.attribute, tag.value);
                });
            });
        }

        // Update liked/disliked colors from outfit analysis
        const outfitColors = outfitAnalysis.colorPalette;
        if (feedbackType === 'like') {
            outfitColors.forEach(color => {
                if (!profile.liked_colors.includes(color)) {
                    profile.liked_colors.push(color);
                }
                // Remove from disliked if previously disliked
                const dislikedIndex = profile.disliked_colors.indexOf(color);
                if (dislikedIndex > -1) {
                    profile.disliked_colors.splice(dislikedIndex, 1);
                }
            });
        } else if (feedbackType === 'dislike' && microReasons?.includes('Color')) {
            outfitColors.forEach(color => {
                if (!profile.disliked_colors.includes(color)) {
                    profile.disliked_colors.push(color);
                }
                // Remove from liked if previously liked
                const likedIndex = profile.liked_colors.indexOf(color);
                if (likedIndex > -1) {
                    profile.liked_colors.splice(likedIndex, 1);
                }
            });
        }

        profile.lastUpdated = this.nowIso();
        await this.saveUserProfile(profile);

        return profile;
    }

    // Check if a tag matches a feedback reason
    private static tagMatchesReason(tag: any, reason: FeedbackReason, items: any[]): boolean {
        switch (reason) {
            case 'Top':
            case 'Bottom':
            case 'Shoes':
            case 'Outerwear':
            case 'Accessories':
                return tag.itemId === reason.toLowerCase();
            case 'Color':
                return tag.attribute === 'color';
            case 'Fit':
                return tag.attribute === 'fit';
            case 'Pattern':
                return tag.attribute === 'pattern';
            case 'Material':
                return tag.attribute === 'material';
            case 'Overall vibe':
                return tag.attribute === 'vibe' || tag.attribute === 'overall_vibe';
            default:
                return false;
        }
    }

    // Track rejections for progressive rejection
    private static trackRejection(profile: UserProfile, attribute: string, value: string): void {
        const key = `${attribute}:${value}`;
        let rejection = profile.rejections.find(r => `${r.attribute}:${r.value}` === key);

        if (!rejection) {
            rejection = {
                attribute,
                value,
                streak: 0,
                lastRejected: this.nowIso(),
                isHardBan: false
            };
            profile.rejections.push(rejection);
        }

        rejection.streak += 1;
        const timestamp = this.nowIso();
        rejection.lastRejected = timestamp;

        // Apply hard ban after threshold
        if (rejection.streak >= HARD_BAN_THRESHOLD) {
            rejection.isHardBan = true;
        }
    }

    // Check if an attribute should be avoided
    static shouldAvoidAttribute(profile: UserProfile, attribute: string, value: string): boolean {
        const key = `${attribute}:${value}`;

        // Check hard bans
        const rejection = profile.rejections.find(r => `${r.attribute}:${r.value}` === key);
        if (rejection?.isHardBan) {
            return true;
        }

        // Check cooldown period
        if (rejection && !rejection.isHardBan) {
            const daysSinceRejection = (Date.now() - new Date(rejection.lastRejected).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceRejection < COOLDOWN_DAYS) {
                return true;
            }
        }

        // Check onboarding constraints
        const constraints = profile.onboardingConstraints;
        switch (attribute) {
            case 'color':
                return constraints.colorsToAvoid?.includes(value) || false;
            case 'fit':
                return constraints.fitsToAvoid?.includes(value) || false;
            case 'pattern':
                return constraints.patternsToAvoid?.includes(value) || false;
            case 'category':
                return constraints.itemsToAvoid?.some(item =>
                    item.toLowerCase().includes(value.toLowerCase()) ||
                    value.toLowerCase().includes(item.toLowerCase())
                ) || false;
            default:
                return false;
        }
    }

    // Score an outfit based on user preferences
    static scoreOutfit(profile: UserProfile, outfitAnalysis: OutfitAnalysis): number {
        let totalScore = 0;
        let totalConfidence = 0;

        outfitAnalysis.tags.forEach(tag => {
            const key = `${tag.attribute}:${tag.value}`;
            const weight = profile.preferenceWeights[key] || 0;

            // Skip if this attribute should be avoided
            if (this.shouldAvoidAttribute(profile, tag.attribute, tag.value)) {
                return;
            }

            totalScore += weight * tag.confidence;
            totalConfidence += tag.confidence;
        });

        // Normalize by total confidence
        if (totalConfidence > 0) {
            return totalScore / totalConfidence;
        }

        return 0;
    }

    // Save feedback to database
    static async saveFeedback(
        userId: string,
        outfitId: string | undefined,
        outfitTheme: string,
        feedbackType: 'like' | 'dislike',
        outfitAnalysis: OutfitAnalysis,
        microReasons?: FeedbackReason[],
        reason?: string
    ): Promise<string | null> {
        if (!this.canSync(userId)) {
            return null;
        }

        const resolvedOutfitId = this.ensureOutfitId(outfitId);

        try {
            await supabase
                .from('outfits')
                .upsert({
                    id: resolvedOutfitId,
                    image_url: `generated://${resolvedOutfitId}`,
                    tags: {
                        theme: outfitTheme,
                        analysis: outfitAnalysis,
                        reasons: microReasons || [],
                        reason
                    }
                }, { onConflict: 'id' });
        } catch (error) {
            if (!this.handleSupabaseError(error)) {
                console.error('Error upserting outfit metadata:', error);
            }
        }

        try {
            const { error } = await supabase
                .from('interactions')
                .insert({
                    user_id: userId,
                    outfit_id: resolvedOutfitId,
                    action: feedbackType,
                    reasons: microReasons || [],
                    session_no: this.getSessionCounter(),
                    created_at: this.nowIso()
                });

            if (error) {
                if (this.handleSupabaseError(error)) {
                    return null;
                }
                throw error;
            }
            return resolvedOutfitId;
        } catch (error) {
            if (!this.handleSupabaseError(error)) {
                console.error('Error saving feedback:', error);
            }
            return null;
        }
    }

    // Get user's preference summary
    static async getPreferenceSummary(userId: string) {
        if (!this.canSync(userId)) {
            return null;
        }

        try {
            const { data: preferenceRow, error: preferenceError } = await supabase
                .from('user_preferences')
                .select('weights, updated_at')
                .eq('user_id', userId)
                .maybeSingle();

            if (preferenceError) {
                if (this.handleSupabaseError(preferenceError)) {
                    return null;
                }
                throw preferenceError;
            }

            const { data: attrRows, error: attrError } = await supabase
                .from('user_attr_stats')
                .select('*')
                .eq('user_id', userId);

            if (attrError) {
                if (this.handleSupabaseError(attrError)) {
                    return null;
                }
                throw attrError;
            }

            const rawWeights = preferenceRow?.weights || {};

            const likes = Object.entries(rawWeights)
                .filter(([key, value]) => !RESERVED_WEIGHT_KEY_SET.has(key) && typeof value === 'number' && value > 0)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10);

            const dislikes = Object.entries(rawWeights)
                .filter(([key, value]) => !RESERVED_WEIGHT_KEY_SET.has(key) && typeof value === 'number' && value < 0)
                .sort(([, a], [, b]) => (a as number) - (b as number))
                .slice(0, 10);

            return {
                likes,
                dislikes,
                updatedAt: preferenceRow?.updated_at ?? null,
                attrStats: attrRows ?? []
            };
        } catch (error) {
            if (this.handleSupabaseError(error)) {
                return null;
            }
            console.error('Error getting preference summary:', error);
            return null;
        }
    }

    // Get top liked attributes
    static getTopLikedAttributes(profile: UserProfile, limit: number = 10): Array<{key: string, weight: number}> {
        return Object.entries(profile.preferenceWeights)
            .filter(([_, weight]) => weight > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([key, weight]) => ({ key, weight }));
    }

    // Get top disliked attributes
    static getTopDislikedAttributes(profile: UserProfile, limit: number = 10): Array<{key: string, weight: number}> {
        return Object.entries(profile.preferenceWeights)
            .filter(([_, weight]) => weight < 0)
            .sort(([, a], [, b]) => a - b)
            .slice(0, limit)
            .map(([key, weight]) => ({ key, weight }));
    }
}
