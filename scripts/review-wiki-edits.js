const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const {spawnSync} = require("node:child_process");
const readline = require("node:readline/promises");
const matter = require("gray-matter");

const root = path.resolve(__dirname, "..");
const table = "darien_wiki_article_edits";
const configSource = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const config = vm.runInNewContext(`${configSource}\nCONFIG;`, {
    marked: {setOptions() {}}
});
const realtime = config.map.realtime;
const headers = {
    apikey: realtime.key,
    Authorization: `Bearer ${realtime.key}`,
    "Content-Type": "application/json"
};

function apiUrl(query = ""){
    return `${realtime.url}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

async function request(method, query, body){
    const response = await fetch(apiUrl(query), {
        method,
        headers: {
            ...headers,
            ...(method !== "GET" ? {Prefer: "return=representation"} : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    if(!response.ok){
        const responseText = await response.text();
        throw new Error(`Supabase request failed (${response.status}): ${responseText}`);
    }
    if(response.status === 204)
        return null;
    const responseText = await response.text();
    return responseText ? JSON.parse(responseText) : null;
}

function parseArticle(markdown, label){
    try{
        return matter(markdown).data;
    }catch(error){
        throw new Error(`${label}: ${error.message}`);
    }
}

function getLocalArticlePath(articleFile){
    if(typeof articleFile !== "string" ||
        !/^[^/]+(?:\/[^/]+)*\.md$/.test(articleFile) ||
        articleFile.includes("\\") ||
        articleFile.split("/").some(part => part === "." || part === ".."))
        throw new Error(`Refusing unexpected wiki article path: ${articleFile}`);

    const wikiDirectory = path.resolve(root, "wiki");
    const articlePath = path.resolve(wikiDirectory, ...articleFile.split("/"));
    const realWikiDirectory = fs.realpathSync(wikiDirectory);
    if(!articlePath.startsWith(`${wikiDirectory}${path.sep}`) ||
        !fs.existsSync(articlePath) ||
        !fs.realpathSync(articlePath).startsWith(`${realWikiDirectory}${path.sep}`))
        throw new Error(`Wiki article does not exist: ${articleFile}`);
    return articlePath;
}

function stripGMNotes(markdown){
    return replaceGMNoteBlocks(markdown.replace(/\r\n/g, "\n"), () => "");
}

function mergeGMNotes(localMarkdown, proposedMarkdown){
    const gmSections = [];
    replaceGMNoteBlocks(localMarkdown.replace(/\r\n/g, "\n"), match => {
        gmSections.push(match);
        return "";
    });
    const publicMarkdown = stripGMNotes(proposedMarkdown).trimEnd();
    return gmSections.length
        ? `${publicMarkdown}\n\n${gmSections.join("\n\n")}\n`
        : `${publicMarkdown}\n`;
}

function replaceGMNoteBlocks(markdown, replaceBlock){
    const codeBlocks = [];
    const placeholder = index => `\u0000WIKI_REVIEW_CODE_${index}\u0000`;
    const maskCode = code => {
        const index = codeBlocks.push(code) - 1;
        return placeholder(index);
    };

    let protectedMarkdown = markdown.replace(
        /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g,
        maskCode
    );
    protectedMarkdown = protectedMarkdown.replace(
        /(`+)(?:\\.|[^`])*?\1/g,
        maskCode
    );
    protectedMarkdown = protectedMarkdown.replace(
        /<!--GM([\s\S]*?)-->/g,
        (match, content) => replaceBlock(match, content)
    );

    return protectedMarkdown.replace(
        /\u0000WIKI_REVIEW_CODE_(\d+)\u0000/g,
        (_, index) => codeBlocks[Number(index)]
    );
}

function hasGMNotes(markdown){
    let hasNotes = false;
    replaceGMNoteBlocks(markdown, match => {
        hasNotes = true;
        return match;
    });
    return hasNotes;
}

function articleDisplayName(markdown, data){
    if(data.fullname)
        return data.fullname;
    const heading = markdown.match(/^#\s+(.+)$/m);
    return heading ? heading[1].trim() : data.name || "Unnamed article";
}

function printDiff(localPath, proposedMarkdown){
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "darien-wiki-edit-"));
    const proposedPath = path.join(temporaryDirectory, "proposed.md");
    try{
        fs.writeFileSync(proposedPath, proposedMarkdown, "utf8");
        const result = spawnSync("git", [
            "diff", "--no-index", "--no-color", "--", localPath, proposedPath
        ], {encoding: "utf8"});
        if(result.error)
            throw result.error;
        if(result.status > 1)
            throw new Error(result.stderr || "Could not compare article revisions.");
        process.stdout.write(result.stdout || "(No content changes.)\n");
    }finally{
        fs.rmSync(temporaryDirectory, {recursive: true, force: true});
    }
}

async function loadRevisions(){
    const query = new URLSearchParams({
        select: "article_file,proposed_markdown,base_markdown,proposed_by,submitted_at,status",
        status: "in.(pending,approved)",
        order: "submitted_at.asc"
    });
    return request("GET", query.toString());
}

async function rejectInvalidPendingRevision(revision, reason){
    if(revision.status !== "pending")
        throw new Error(reason);

    console.error(`Cannot approve ${revision.article_file}: ${reason}`);
    const answer = await reviewPrompt.question("Reject this invalid revision? [y]es / [n]o / [q]uit: ");
    const decision = answer.trim().toLowerCase();
    if(decision === "q")
        throw new Error("Review stopped. No further revisions were processed.");
    if(decision !== "y" && decision !== "yes")
        throw new Error(`Invalid revision was kept; ${revision.article_file} was not changed locally.`);

    const deleted = await request("DELETE", new URLSearchParams({
        article_file: `eq.${revision.article_file}`,
        status: "eq.pending",
        submitted_at: `eq.${revision.submitted_at}`
    }).toString());
    if(!deleted?.length)
        throw new Error("The revision changed during review. It was not rejected; review the latest version on the next upload.");
    console.log("Rejected invalid revision. The local article remains unchanged.");
}

async function writeApprovedRevision(revision){
    const articlePath = getLocalArticlePath(revision.article_file);
    const localMarkdown = fs.readFileSync(articlePath, "utf8");
    const localData = parseArticle(localMarkdown, revision.article_file);
    let proposedData;
    try{
        proposedData = parseArticle(revision.proposed_markdown, revision.article_file);
    }catch(error){
        await rejectInvalidPendingRevision(revision, error.message);
        return;
    }

    let validationError = null;
    if(proposedData.category !== localData.category)
        validationError = new Error(`Article category does not match the proposal for ${revision.article_file}.`);
    else if(revision.proposed_by !== "GM" &&
        proposedData.player !== localData.player)
        validationError = new Error(`Player assignment does not match the proposal for ${revision.article_file}.`);
    else if(Object.prototype.hasOwnProperty.call(localData, "name") &&
        proposedData.name !== localData.name)
        validationError = new Error(`Article name does not match the proposal for ${revision.article_file}.`);
    else if(hasGMNotes(revision.proposed_markdown))
        validationError = new Error(`Proposal unexpectedly contains GM-only notes: ${revision.article_file}`);
    if(validationError){
        await rejectInvalidPendingRevision(revision, validationError.message);
        return;
    }

    const approvedMarkdown = mergeGMNotes(localMarkdown, revision.proposed_markdown);
    if(revision.status === "pending"){
        if(revision.base_markdown !== stripGMNotes(localMarkdown)){
            console.warn("The local article changed after this proposal was started; review the full diff carefully.");
        }

        console.log(`\n${revision.proposed_by} proposed changes to ${articleDisplayName(revision.proposed_markdown, proposedData)} (${revision.submitted_at}).`);
        printDiff(articlePath, approvedMarkdown);

        const answer = await reviewPrompt.question("Approve and write locally? [y]es / [n]o / [q]uit: ");
        const decision = answer.trim().toLowerCase();
        if(decision === "q")
            throw new Error("Review stopped. No further revisions were processed.");
        if(decision !== "y" && decision !== "yes"){
            const deleted = await request("DELETE", new URLSearchParams({
                article_file: `eq.${revision.article_file}`,
                status: "eq.pending",
                submitted_at: `eq.${revision.submitted_at}`
            }).toString());
            if(!deleted?.length)
                throw new Error("The revision changed during review. It was not rejected; review the latest version on the next upload.");
            console.log("Rejected. The published local article remains unchanged.");
            return;
        }

        const approved = await request("PATCH", new URLSearchParams({
            article_file: `eq.${revision.article_file}`,
            status: "eq.pending",
            submitted_at: `eq.${revision.submitted_at}`
        }).toString(), {
            status: "approved"
        });
        if(!approved?.length)
            throw new Error("The revision changed during review. It was not approved; review the latest version on the next upload.");
    }

    fs.writeFileSync(articlePath, approvedMarkdown, "utf8");
    console.log(`Approved revision saved to ${path.relative(root, articlePath)}.`);
}

async function review(){
    const revisions = await loadRevisions();
    if(!revisions.length){
        console.log("No wiki article revisions need review.");
        return;
    }

    const pending = revisions.filter(revision => revision.status === "pending");
    const approved = revisions.filter(revision => revision.status === "approved");
    if(approved.length)
        console.log(`Resuming ${approved.length} previously approved revision(s).`);

    for(const revision of approved)
        await writeApprovedRevision(revision);

    if(!pending.length)
        return;

    reviewPrompt = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    try{
        for(const revision of pending)
            await writeApprovedRevision(revision);
    }finally{
        reviewPrompt.close();
    }
}

async function clearApproved(){
    const revisions = await loadRevisions();
    let cleared = 0;
    for(const revision of revisions.filter(entry => entry.status === "approved")){
        const articlePath = getLocalArticlePath(revision.article_file);
        const localMarkdown = fs.readFileSync(articlePath, "utf8");
        if(stripGMNotes(localMarkdown) !== revision.proposed_markdown){
            console.warn(`Keeping approved revision for ${revision.article_file}: local file does not match it.`);
            continue;
        }

        const deleted = await request("DELETE", new URLSearchParams({
            article_file: `eq.${revision.article_file}`,
            status: "eq.approved",
            submitted_at: `eq.${revision.submitted_at}`
        }).toString());
        cleared += deleted?.length || 0;
    }
    console.log(`Cleared ${cleared} published wiki revision(s) from shared storage.`);
}

let reviewPrompt;
const command = process.argv[2];

(async () => {
    try{
        if(command === "review")
            await review();
        else if(command === "clear-approved")
            await clearApproved();
        else
            throw new Error("Usage: node scripts/review-wiki-edits.js <review|clear-approved>");
    }catch(error){
        console.error(error.message);
        process.exitCode = 1;
    }
})();
