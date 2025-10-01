export type HollandScores = Record<string, number>;
export type TopGroup = { type: string; score: number };

export function processTopGroups(hollandScores: HollandScores): TopGroup[] {
    const sorted = Object.entries(hollandScores || {})
        .map(([k, v]) => [k.toUpperCase(), Number(v)] as [string, number])
        .sort((a, b) => b[1] - a[1]);

    // Gom bucket theo điểm
    const groupsByScore: { score: number; types: string[] }[] = [];
    for (let i = 0; i < sorted.length;) {
        const score = sorted[i][1];
        const types: string[] = [];
        while (i < sorted.length && sorted[i][1] === score) {
            types.push(sorted[i][0]);
            i++;
        }
        groupsByScore.push({ score, types });
    }

    // Áp rule BE
    let topGroups: TopGroup[] = [];
    if (groupsByScore.length > 0) {
        const maxBucket = groupsByScore[0];
        if (maxBucket.types.length >= 4 || (groupsByScore.length === 1 && maxBucket.types.length === 6)) {
            topGroups = [];
        } else {
            const included: TopGroup[] = [];
            for (let bi = 0; bi < groupsByScore.length && included.length < 3; bi++) {
                const bucket = groupsByScore[bi];
                if (included.length + bucket.types.length <= 3) {
                    bucket.types.forEach(t => included.push({ type: t, score: bucket.score }));
                } else {
                    // nếu thêm cả bucket sẽ vượt quá 3 nhóm -> bỏ nguyên bucket
                }
            }
            topGroups = included;
        }
    }

    return topGroups;
}
