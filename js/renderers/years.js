function formatYear(year){

    const diff = CONFIG.world.currentYear - year;

    if(diff === 0)
        return `${year} (the current year)`;

    if(diff > 0)
    return `${year} (${diff} years ago)`;

    return `${year} (in ${-diff} years)`;

}

function renderYears(markdown){

    return markdown.replace(
        /\{\{year:(\d+|current)\}\}/g,
        (match, year)=>{

            const resolvedYear = year === "current"
                ? CONFIG.world.currentYear
                : parseInt(year);

            return formatYear(resolvedYear);

        }
    );

}