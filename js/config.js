const CONFIG = {

    world:{

        currentYear:3864

    },

    map: {
        kilometersPerMapUnit: 1,
        snapDistance: 5,
        realtime: {
            url: "https://fudrygpmpbputjmzbozv.supabase.co",
            key: "sb_publishable_NHBk-ArPhzzvHE0EAYHG5w_qWL59Bnk",
            room: "darien-map"
        },
        layerOrder: [
            "nations",
            "settlements",
            "roads",
            "rivers"
        ],
        layerVisibility: {
            nations: true,
            rivers: true,
            roads: true,
            settlements: true
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

marked.setOptions({
    breaks: true
});