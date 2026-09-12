let imageViewer;

function getImageViewer(){

    if(imageViewer)
        return imageViewer;

    imageViewer = document.createElement("div");
    imageViewer.className = "image-viewer";
    imageViewer.setAttribute("aria-hidden", "true");
    imageViewer.innerHTML = `
        <img class="image-viewer-image" alt="">
    `;

    imageViewer.addEventListener("click", closeImageViewer);
    document.body.appendChild(imageViewer);

    return imageViewer;

}

function openImageViewer(image){

    const viewer = getImageViewer();
    const viewerImage = viewer.querySelector(".image-viewer-image");

    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt;
    viewer.classList.add("image-viewer-open");
    viewer.setAttribute("aria-hidden", "false");

}

function closeImageViewer(){

    if(!imageViewer)
        return;

    imageViewer.classList.remove("image-viewer-open");
    imageViewer.setAttribute("aria-hidden", "true");

}

document.addEventListener("click", event => {

    const image = event.target.closest("[data-expand-image=\"true\"]");

    if(!image)
        return;

    event.preventDefault();
    event.stopPropagation();

    if(imageViewer?.classList.contains("image-viewer-open"))
        closeImageViewer();
    else
        openImageViewer(image);

});

document.addEventListener("keydown", event => {

    if(event.key === "Escape")
        closeImageViewer();

});