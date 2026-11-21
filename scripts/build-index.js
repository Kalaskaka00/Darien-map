const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { globSync } = require("glob");

const metadataFile = "data/wikiMeta.json";
const unlinkedArticlesFile = "wiki/Unlinked Articles.md";
const unlinkedArticlesRelativeFile = "Unlinked Articles.md";
const unlinkedArticlesName = "Unlinked Articles";

let previousMetadata = {};

function getPlaceLocation(location) {

    if(typeof location === "string")
        return location.trim() || null;

    if(!Array.isArray(location))
        return null;

    const wikiLinkSyntax = location.some(Array.isArray);
    const locations = location
        .flat(Infinity)
        .filter(value => typeof value === "string")
        .map(value => value.trim())
        .filter(Boolean);

    if(!locations.length)
        return null;

    return locations
        .map(value => wikiLinkSyntax ? `[[${value}]]` : value)
        .join(", ");

}

if (fs.existsSync(metadataFile)) {
    previousMetadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
}

// Hitta alla Markdown-filer under wiki/
const files = globSync("wiki/**/*.md").filter(file =>
    !file.includes("Templates/") &&
    !file.includes("Templates\\") &&
    file.replace(/\\/g, "/") !== unlinkedArticlesFile
);

const wikiIndex = [];
const names = new Set();
const referencesByFile = new Map();

for (const file of files) {

    const content = fs.readFileSync(file, "utf8");
    const parsed = matter(content);

    const data = parsed.data;

    // Hämta rubriken (# Titel) om name saknas
    let title = data.name;

    if (!title) {
        const match = parsed.content.match(/^#\s+(.+)$/m);
        title = match ? match[1].trim() : path.basename(file, ".md");
    }

    // Kvalitetskontroller
    if (names.has(title)) {
        console.warn(`⚠ Dubblett: ${title}`);
    }

    names.add(title);

    const gmSections = [...parsed.content.matchAll(/<!--GM([\s\S]*?)-->/g)]
        .map(match => match[1])
        .join("\n");
    const publicContent = parsed.content.replace(/<!--GM[\s\S]*?-->/g, "");
    const getReferences = content => [...content.matchAll(/(?<!!)\[\[(.*?)\]\]/g)]
        .map(match => match[1].split("|")[0].split("#")[0].trim())
        .filter(Boolean);
    const references = [
        ...getReferences(publicContent),
        ...getReferences(parsed.matter)
    ];
    const gmReferences = getReferences(gmSections);

    referencesByFile.set(file.replace(/^wiki[\\/]/, "").replace(/\\/g, "/"), {
        references,
        gmReferences
    });

    const map = data.map || null;
    const border = data.border || null;

wikiIndex.push({
    id: data.id || null,
    name: title,
    category: data.category || "Unknown",
    type: data.type || null,
    ...(data.category === "place" ? {
        location: getPlaceLocation(data.location)
    } : {}),
    file: file.replace(/^wiki[\\/]/, "").replace(/\\/g, "/"),
    map: data.map || null,
    view: data.view || null,
    border: data.border || null,
    color: data.color || null,
    visibility: data.visibility || null,
    related: data.related ?? null,
    gmReferences: [],
    startYear: data.startYear ?? null,
    endYear: data.endYear ?? null
});
}

const normalizeArticleName = name =>
    name.toLowerCase().replace(/['\u2019`]/g, "'");

const articlesByName = new Map(
    wikiIndex.map(article => [normalizeArticleName(article.name), article])
);

wikiIndex.forEach(article => {
    const referenceData = referencesByFile.get(article.file) || {};
    const references = referenceData.references || [];
    const gmReferences = referenceData.gmReferences || [];

    article.references = [...new Set(
        references
            .map(reference => articlesByName.get(normalizeArticleName(reference)))
            .filter(Boolean)
            .filter(reference => reference.file !== article.file)
            .map(reference => reference.name)
    )].sort((left, right) => left.localeCompare(right));

    article.gmReferences = [...new Set(
        gmReferences
            .map(reference => articlesByName.get(normalizeArticleName(reference)))
            .filter(Boolean)
            .filter(reference => reference.file !== article.file)
            .map(reference => reference.name)
    )].sort((left, right) => left.localeCompare(right));
});

if(articlesByName.has(normalizeArticleName(unlinkedArticlesName))){
    throw new Error(`An article named "${unlinkedArticlesName}" already exists.`);
}

const unlinkedArticles = new Map();

wikiIndex.forEach(article => {
    const referenceData = referencesByFile.get(article.file) || {};
    const references = [
        ...(referenceData.references || []),
        ...(referenceData.gmReferences || [])
    ];

    references.forEach(reference => {
        const key = normalizeArticleName(reference);
        if(articlesByName.has(key))
            return;

        if(!unlinkedArticles.has(key)){
            unlinkedArticles.set(key, {
                name: reference,
                sources: new Map()
            });
        }

        unlinkedArticles.get(key).sources.set(article.file, article.name);
    });
});

const sortedUnlinkedArticles = [...unlinkedArticles.values()]
    .sort((left, right) =>
        right.sources.size - left.sources.size ||
        left.name.localeCompare(right.name)
    );

const reportLines = [
    "---",
    `name: ${unlinkedArticlesName}`,
    "category: summary",
    "visibility: gm",
    "---",
    "",
    `# ${unlinkedArticlesName}`,
    ""
];

if(sortedUnlinkedArticles.length){
    sortedUnlinkedArticles.forEach(({name, sources}) => {
        const linkedArticles = [...sources.values()]
            .sort((left, right) => left.localeCompare(right));
        const articleLabel = linkedArticles.length === 1
            ? "linked article"
            : "linked articles";

        reportLines.push(
            `**${name}** (${linkedArticles.length} ${articleLabel})`,
            '<ul class="unlinked-article-sources">',
            ...linkedArticles.map(articleName => `<li>[[${articleName}]]</li>`),
            "</ul>",
            ""
        );
    });
} else {
    reportLines.push("No unresolved article links.", "");
}

fs.writeFileSync(unlinkedArticlesFile, reportLines.join("\n"));

wikiIndex.push({
    id: null,
    name: unlinkedArticlesName,
    category: "summary",
    type: null,
    file: unlinkedArticlesRelativeFile,
    map: null,
    view: null,
    border: null,
    color: null,
    visibility: "gm",
    related: null,
    gmReferences: [],
    startYear: null,
    endYear: null,
    references: [...new Set(
        sortedUnlinkedArticles.flatMap(({sources}) => [...sources.values()])
    )].sort((left, right) => left.localeCompare(right))
});

// Skapa data-mappen om den inte finns
if (!fs.existsSync("data")) {
    fs.mkdirSync("data");
}

// Skriv wikiIndex.json
fs.writeFileSync(
    "data/wikiIndex.json",
    JSON.stringify(wikiIndex, null, 4)
);

const latestBuild = new Date().toISOString();
const latestChange = process.env.WIKI_CHANGE_NOTE?.trim() ||
    previousMetadata.latestChange ||
    "No change note recorded.";
const changelog = Array.isArray(previousMetadata.changelog)
    ? [...previousMetadata.changelog]
    : [];

if(previousMetadata.latestBuild &&
    !changelog.some(entry => entry.date === previousMetadata.latestBuild)){
    changelog.unshift({
        date: previousMetadata.latestBuild,
        articleCount: previousMetadata.articleCount,
        changes: previousMetadata.latestChange || "No change note recorded."
    });
}

changelog.unshift({
    date: latestBuild,
    articleCount: wikiIndex.length,
    changes: latestChange
});

fs.writeFileSync(
    metadataFile,
    JSON.stringify({
        latestBuild,
        articleCount: wikiIndex.length,
        latestChange,
        changelog
    }, null, 4)
);

console.log(`✓ Skapade wikiIndex.json (${wikiIndex.length} artiklar)`);