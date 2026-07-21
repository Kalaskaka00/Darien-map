function formatYear(year){

    const diff = currentYear - year;

    if(diff === 0)
        return `${year} (this year)`;

    if(diff > 0)
    return `${year} (${diff} years ago)`;

    return `${year} (in ${-diff} years)`;

}

function renderYears(markdown){

    return markdown.replace(
        /\{\{year:(\d+)\}\}/g,
        (match, year)=>{

            return formatYear(parseInt(year));

        }
    );

}