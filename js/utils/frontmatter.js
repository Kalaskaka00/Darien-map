function extractFrontmatter(markdown){

    if(!markdown.startsWith("---"))
        return {
            data:{},
            content:markdown
        };

    const end = markdown.indexOf("\n---",3);

    if(end === -1)
        return {
            data:{},
            content:markdown
        };

    const yaml = markdown.substring(3,end).trim();

    const content = markdown.substring(end+4);

    const data = {};

    const lines = yaml.split("\n");

let currentKey = null;

lines.forEach(line => {

    // YAML-lista?
    if(line.startsWith("  - ")){

        if(currentKey){

            if(!Array.isArray(data[currentKey]))
                data[currentKey] = [];

            data[currentKey].push(
                line.substring(4).trim()
            );

        }

        return;
    }

    const i = line.indexOf(":");

    if(i === -1)
        return;

    const key = line.substring(0,i).trim();

    let value = line.substring(i+1).trim();

    value = value.replace(/^"(.*)"$/,"$1");

    currentKey = key;

    data[key] = value;

    });

    return{
        data,
        content
    };

}