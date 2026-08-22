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

    },

    {

        id:"stolen_road",

        name:"Stolen Road",

        class:"trail",

        article:null,

        points:[

            [728, 839],
            [721, 818],
            [697, 823],
            [661, 831],
            [633, 830],
            [613, 822],
            [581, 828],
            [568, 836]


        ]

    }

];

roads.forEach(addRoad);

