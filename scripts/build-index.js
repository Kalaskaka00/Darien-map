const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { globSync } = require("glob");

// Hitta alla Markdown-filer under wiki/
const files = globSync("wiki/**/*.md");

const wikiIndex = [];
const names = new Set();

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

    wikiIndex.push({
        id: data.id || null,
        name: title,
        category: data.category || "Unknown",
        file: file.replace(/^wiki[\\/]/, "").replace(/\\/g, "/"),
map:
    (data.x !== undefined && data.y !== undefined)
        ? {
            x: data.x,
            y: data.y,
            icon: data.IconType
        }
        : null
    });
}

// Skapa data-mappen om den inte finns
if (!fs.existsSync("data")) {
    fs.mkdirSync("data");
}

// Skriv wikiIndex.json
fs.writeFileSync(
    "data/wikiIndex.json",
    JSON.stringify(wikiIndex, null, 4)
);

console.log(`✓ Skapade wikiIndex.json (${wikiIndex.length} artiklar)`);