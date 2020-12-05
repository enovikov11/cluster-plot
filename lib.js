function clusterPlot(rawPoints, { gridSize = 8, svgSize = 500, rawOutput = false, sharpCompatible = false } = {}) {
    const ITERATIONS_COUNT = 3, SCALE_FACTOR = 4;

    function unionRaw(rawPoints) {
        const sumCount = rawPoints.length;

        return {
            x: rawPoints.map(([x]) => x).reduce((a, b) => a + b, 0) / sumCount,
            y: rawPoints.map(([, y]) => y).reduce((a, b) => a + b, 0) / sumCount,
            count: sumCount
        }
    }

    function union(points) {
        const sumCount = points.map(({ count }) => count).reduce((a, b) => a + b, 0);

        return {
            x: points.map(({ x, count }) => x * count).reduce((a, b) => a + b, 0) / sumCount,
            y: points.map(({ y, count }) => y * count).reduce((a, b) => a + b, 0) / sumCount,
            count: sumCount
        };
    }

    function grid(rawPoints, size) {
        const clusters = {};

        for (let [x, y] of rawPoints) {
            const id = Math.floor(x * size * (1 - 1e-10)) + Math.floor(y * size * (1 - 1e-10)) * size;
            clusters[id] = clusters[id] || [];
            clusters[id].push([x, y]);
        }

        return Object.values(clusters).map(unionRaw);
    }

    function kMeans(points, basePoints) {
        const clusters = {};

        for (let i = 0; i < points.length; i++) {
            const id = basePoints.map((point, id) => ({
                diff: (points[i].x - point.x) ** 2 + (points[i].y - point.y) ** 2,
                id
            })).reduce((a, b) => a.diff < b.diff ? a : b).id;

            clusters[id] = clusters[id] || [];
            clusters[id].push(points[i])
        }

        return Object.values(clusters).map(union);
    }

    function overlap(points) {
        const mapper = new Array(points.length).fill().map((_, i) => i);
        const clusters = {};

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const a = points[i], b = points[j],
                    rSum = (Math.sqrt(a.count / rawPoints.length) + Math.sqrt(b.count / rawPoints.length)) / gridSize,
                    d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

                if (rSum / d > 0.9) {
                    mapper[j] = mapper[i];
                }
            }
        }

        mapper.forEach((id, i) => {
            clusters[id] = clusters[id] || [];
            clusters[id].push(points[i]);
        });

        return Object.values(clusters).map(union);
    }

    function makeSvg(points) {
        const circles = [], texts = [], fontSizes = [0, 2, 1.35, 0.9, 0.75, 0.6];
        for (let { x, y, count } of points) {
            const r = Math.sqrt(count / rawPoints.length) / gridSize;
            circles.push(`<circle cx="${svgSize * (x * 0.8 + 0.1)}" cy="${svgSize * (y * 0.8 + 0.1)}" r="${svgSize * r * 0.8}" fill="white" />`);
            if (count) {
                const text = String(count), size = r * (fontSizes[text.length] || (3 / text.length));
                texts.push(sharpCompatible ?
                    `<text x="${svgSize * (x * 0.8 + 0.1)}" y="${svgSize * (y * 0.8 + 0.1 + 0.2 * size)}" font-size="${svgSize * 0.8 * size}" dominant-baseline="center" text-anchor="middle" font-family="monospace" fill="black">${text}</text>` :
                    `<text x="${svgSize * (x * 0.8 + 0.1)}" y="${svgSize * (y * 0.8 + 0.1)}" font-size="${svgSize * 0.8 * size}" dominant-baseline="middle" text-anchor="middle" font-family="monospace" fill="black">${text}</text>`);
            }
        }
        return rawOutput ? { circles: circles.join(''), texts: texts.join('') } : `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">${circles.join('')}${texts.join('')}</svg>`;
    }

    let points = grid(rawPoints, gridSize * SCALE_FACTOR), basePoints = grid(rawPoints, gridSize);

    for (let i = 0; i < ITERATIONS_COUNT; i++) {
        basePoints = overlap(kMeans(points, basePoints))
    }

    return makeSvg(basePoints);
}

if (typeof window !== "undefined") {
    window.clusterPlot = clusterPlot;
}

if (typeof module !== "undefined") {
    module.exports = clusterPlot;
}
