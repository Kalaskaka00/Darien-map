const CONFIG = {

    world:{

        currentYear:3863

    },

    map: {
        zoom: {
            minimum: -0.5,
            maximum: 3.5
        },
        kilometersPerMapUnit: 1,
        snapDistance: 5,
        realtime: {
            url: "https://fudrygpmpbputjmzbozv.supabase.co",
            key: "sb_publishable_NHBk-ArPhzzvHE0EAYHG5w_qWL59Bnk",
            room: "darien-map"
        },
        layerOrder: [
            "nations",
            "regions",
            "settlements",
            "places",
            "tradeRoutes",
            "roads",
            "rivers",
            "decorations"
        ],
        layerVisibility: {
            nations: true,
            regions: true,
            rivers: true,
            roads: true,
            settlements: true,
            places: true,
            tradeRoutes: true,
            decorations: true
        },
        decorations: {
            minimum: 1,
            maximum: 5,
            iconSize: 96
        },
        parchmentOverhang: {
            horizontal: 50,
            vertical: 50
        }
    },

    npc: {
        portraitSwitchDelay: 5000
    },

    gmColor: "#1B6B16",

    players: {
        "Ludwig": "#EF3BF5",
        "Mallena": "#03fc73",
        "Rasmus": "#a81d1d"
    }

}

let localYearOverride = null;

function getCurrentYear(){

    return localYearOverride ?? CONFIG.world.currentYear;

}

marked.setOptions({
    breaks: true
});