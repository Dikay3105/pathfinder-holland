interface HollandScores {
    [key: string]: number | string;
}

interface TopGroup {
    type: string;
    score: number;
}

export function processTopGroups(hollandScores: HollandScores): TopGroup[] {

    const sorted = Object.entries(hollandScores || {})
        .map(([k, v]) => [k.toUpperCase(), Number(v)] as [string, number])
        .filter(([, score]) => !isNaN(score) && score > 0)
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) return [];

    // bucket theo điểm
    const groupsByScore: { score: number; types: string[] }[] = [];

    let i = 0;
    while (i < sorted.length) {

        const score = sorted[i][1];
        const types: string[] = [];

        while (i < sorted.length && sorted[i][1] === score) {
            types.push(sorted[i][0]);
            i++;
        }

        groupsByScore.push({ score, types });
    }

    let topGroups: TopGroup[] = [];

    if (groupsByScore.length > 0) {

        const maxBucket = groupsByScore[0];

        // discard case
        if (
            maxBucket.types.length >= 4 ||
            (groupsByScore.length === 1 && maxBucket.types.length === 6)
        ) {
            return [];
        }

        const included: TopGroup[] = [];
        const MAX_GROUPS = 4;

        for (let bi = 0; bi < groupsByScore.length; bi++) {

            const bucket = groupsByScore[bi];

            // nếu vượt 4 → dừng
            if (included.length + bucket.types.length > MAX_GROUPS) {
                break;
            }

            bucket.types.forEach(t =>
                included.push({ type: t, score: bucket.score })
            );

            // đủ ít nhất 3 nhóm
            if (included.length >= 3) {

                const nextBucket = groupsByScore[bi + 1];

                // nếu bucket sau khác điểm → dừng
                if (!nextBucket || nextBucket.score !== bucket.score) {
                    break;
                }
            }
        }

        topGroups = included;
    }

    return topGroups;
}