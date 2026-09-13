const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { globSync } = require("glob");

const metadataFile = "data/wikiMeta.json";

let previousMetadata = {};

if (fs.existsSync(metadataFile)) {
    previousMetadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
}

// Hitta alla Markdown-filer under wiki/
const files = globSync("wiki/**/*.md").filter(file =>
    !file.includes("Templates/") &&
    !file.includes("Templates\\")
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
    const references = getReferences(publicContent);
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
    file: file.replace(/^wiki[\\/]/, "").replace(/\\/g, "/"),
    map: data.map || null,
    view: data.view || null,
    border: data.border || null,
    color: data.color || null,
    visibility: data.visibility || null,
    related: data.related ?? data.Related ?? null,
    gmReferences: [],
    StartYear: data.StartYear ?? null,
    EndYear: data.EndYear ?? null
});
}

const articlesByName = new Map(
    wikiIndex.map(article => [article.name.toLowerCase(), article])
);

wikiIndex.forEach(article => {
    const referenceData = referencesByFile.get(article.file) || {};
    const references = referenceData.references || [];
    const gmReferences = referenceData.gmReferences || [];

    article.references = [...new Set(
        references
            .map(reference => articlesByName.get(reference.toLowerCase()))
            .filter(Boolean)
            .filter(reference => reference.file !== article.file)
            .map(reference => reference.name)
    )].sort((left, right) => left.localeCompare(right));

    article.gmReferences = [...new Set(
        gmReferences
            .map(reference => articlesByName.get(reference.toLowerCase()))
            .filter(Boolean)
            .filter(reference => reference.file !== article.file)
            .map(reference => reference.name)
    )].sort((left, right) => left.localeCompare(right));
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

fs.writeFileSync(
    metadataFile,
    JSON.stringify({
        latestBuild: new Date().toISOString(),
        articleCount: wikiIndex.length,
        latestChange: process.env.WIKI_CHANGE_NOTE?.trim() ||
            previousMetadata.latestChange ||
            "No change note recorded."
    }, null, 4)
);

console.log(`✓ Skapade wikiIndex.json (${wikiIndex.length} artiklar)`);