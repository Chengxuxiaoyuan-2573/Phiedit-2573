export default {
    mirrorNotes: 
`notes.forEach(note => {
    note.positionX *= -1;
});`,

    mirrorEventsX:
`moveXEvents.forEach(event => {
    event.start *= -1;
    event.end *= -1;
});`,

    mirrorEventsY:
`moveYEvents.forEach(event => {
    event.start *= -1;
    event.end *= -1;
});`,

    rotate180:
`rotateEvents.forEach(event => {
    event.start += 180;
    event.end += 180;
});`,

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


} as const;