function refreshEditor(){
    if(!editingShape)
        return;

    editingShape.refresh();

    clearShapeHandles();
    showShapeHandles();

}