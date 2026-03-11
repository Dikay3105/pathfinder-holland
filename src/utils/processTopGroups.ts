interface HollandScores {
    [key: string]: number | string; // cho phép cả number và string từ API
}

interface TopGroup {
    type: string;
    score: number;
}

export function processTopGroups(hollandScores: HollandScores): TopGroup[] {
    // 1. Chuẩn hóa và sắp xếp giảm dần theo điểm
    const sorted = Object.entries(hollandScores || {})
        .map(([k, v]) => [k.toUpperCase(), Number(v)] as [string, number])
        .filter(([, score]) => !isNaN(score) && score > 0) // loại bỏ NaN hoặc điểm 0 nếu cần
        .sort((a, b) => b[1] - a[1]);

    // Nếu không có dữ liệu hợp lệ
    if (sorted.length === 0) {
        return [];
    }

    // 2. Gom thành bucket theo điểm bằng nhau
    const groupsByScore: { score: number; types: string[] }[] = [];
    let i = 0;
    while (i < sorted.length) {
        const score = sorted[i][1];
        const types: string[] = [];

        while (i < sorted.length && sorted[i][1] === score) {
            types.push(sorted[i][0]);
            i++;
        }

        // Optional: sort types theo thứ tự RIASEC chuẩn để thứ tự nhất quán
        // const riasecOrder = ['R', 'I', 'A', 'S', 'E', 'C'];
        // types.sort((a, b) => riasecOrder.indexOf(a) - riasecOrder.indexOf(b));

        groupsByScore.push({ score, types });
    }

    // 3. Áp dụng đúng logic BE
    let topGroups: TopGroup[] = [];

    if (groupsByScore.length > 0) {
        const maxBucket = groupsByScore[0];
        if (maxBucket.types.length >= 4 || (groupsByScore.length === 1 && maxBucket.types.length === 6)) {
            return []; // discard
        }

        const included: TopGroup[] = [];

        for (let bi = 0; bi < groupsByScore.length && included.length < 3; bi++) {
            const bucket = groupsByScore[bi];

            if (included.length + bucket.types.length <= 3) {
                // Fit nguyên → lấy hết bucket
                bucket.types.forEach(t => included.push({ type: t, score: bucket.score }));
            } else {
                // Không fit → DỪNG luôn, không lấy lẻ từ bucket này hay sau
                break;
            }
        }

        topGroups = included;
    }

    return topGroups;
}