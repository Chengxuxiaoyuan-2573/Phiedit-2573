export default {
    mirrorNotes: 
`notes.forEach(note => {
    note.positionX *= -1;
});`,

    mirrorMoveXEvents:
`moveXEvents.forEach(event => {
    event.start *= -1;
    event.end *= -1;
});`,

    mirrorMoveYEvents:
`moveYEvents.forEach(event => {
    event.start *= -1;
    event.end *= -1;
});`,

    reverseRotateEvents:
`rotateEvents.forEach(event => {
    event.start += 180;
    event.end += 180;
});`,

    invertAlphaEvents:
`alphaEvents.forEach(event => {
    event.start = 255 - event.start;
    event.end = 255 - event.end;
})`,

    sideSwitch:
`notes.forEach(note => {
    if(note.above == ABOVE){
        note.above = BELOW;
    }
    else{
        note.above = ABOVE;
    }
});`,

    sideAbove:
`notes.forEach(note => {
    note.above = ABOVE;
});`,

    sideBelow:
`notes.forEach(note => {
    note.above = BELOW;
})`,

    booleanSwitch: 
`notes.forEach(note => {
    if(note.isFake == REAL){
        note.isFake = FAKE;
    }
    else{
        note.isFake = REAL;
    }
})`,
    toReal: 
`notes.forEach(note => {
    note.isFake = REAL;
});`,

    toFake: 
`notes.forEach(note => {
    note.isFake = FAKE;
});`,

    toTap: 
`notes.forEach(note => {
    note.type = TAP;
});`,

    toDrag: 
`notes.forEach(note => {
    note.type = DRAG;
})`,

    toFlick: 
`notes.forEach(note => {
    note.type = FLICK;
})`,

    toHold: 
`notes.forEach(note => {
    note.type = HOLD;
})`,

    toRandom:
`const types = [TAP, DRAG, FLICK, HOLD];
notes.forEach(note => {
    note.type = types[Math.floor(Math.random() * types.length)];
})`,

    hideNotes:
`notes.forEach(note => {
    note.alpha = 0;
})`,

    showNotes: 
`notes.forEach(note => {
    note.alpha = 255;
})`,

    speedNotes:
`notes.forEach(note => {
    note.speed = 9999;
})`
} as const;