function formatYear(year){

    const diff = getCurrentYear() - year;

    if(diff === 0)
        return `${year} (the current year)`;

    if(diff > 0)
    return `${year} (${diff} years ago)`;

    return `${year} (in ${-diff} years)`;

}

function renderYears(markdown){

    return markdown.replace(
        /\{\{year:(-?\d+|current)\}\}/g,
        (match, year)=>{

            const resolvedYear = year === "current"
                ? getCurrentYear()
                : parseInt(year);

            return formatYear(resolvedYear);

        }
    );

}