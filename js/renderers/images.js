function renderImages(markdown, folder){

    return markdown.replace(
        /!\[\[(.*?)(?:\|(.*?))?\]\]/g,
        (match, filename, size)=>{

            let style="";

            if(size){

                if(size.includes("x")){

                    const [w,h]=size.split("x");

                    style=`style="width:${w}px;height:${h}px;"`;

                }else{

                    style=`style="width:${size}px;"`;

                }

            }

            return `<img src="wiki/${folder}/${filename}" ${style}>`;

        }
    );

}