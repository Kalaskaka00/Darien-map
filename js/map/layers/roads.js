function addRoad(road){

    drawLine(

        road,

        {

            ...roadStyles[road.class],
            layer: layers.roads,
            type: "roads",
            shadow: true,
            hover: true

        }

        

    );

}



const roads = [

    {

        id:"south_road",

        name:"South Road",

        class:"road",

        article:null,

        points:[

            [100,200],

            [140,260],

            [220,340]

        ],
    
    },

    {

        id:"kings_road",

        name:"Kings Road",

        class:"highway",

        article:null,

        points:[

            [254, 603],
            [280, 595],
            [315, 597],
            [408, 606],
            [445, 606],
            [486, 594],
            [544, 627],
            [632, 665],
            [729, 673],
            [755, 693],
            [768, 735],
            [746, 817],
            [714, 868],
            [683, 901],
            [686, 964]

        ]

    }

];

roads.forEach(addRoad);

