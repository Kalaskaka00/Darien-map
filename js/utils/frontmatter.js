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

    yaml.split("\n").forEach(line=>{

        const i = line.indexOf(":");

        if(i===-1)
            return;

        const key = line.substring(0,i).trim();

        let value = line.substring(i+1).trim();

        value = value.replace(/^"(.*)"$/,"$1");

        data[key]=value;

    });

    return{
        data,
        content
    };

}