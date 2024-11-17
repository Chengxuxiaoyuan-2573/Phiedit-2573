import { getBeatsValue } from "../tools"
import { isObject, isArray, isNumber, isArrayOf3Numbers, isString } from "../typeCheck"
import { BPM, HitState, NoteType } from "../typeDefinitions"
import { JudgeLine } from "./judgeLine"
import { Note } from "./note"

export class Chart {
    BPMList: BPM[]
    META: {
        charter: string,
        composer: string,
        illustrator: string,
        level: string,
        name: string,
        offset: number
    }
    judgeLineGroup: string[]
    judgeLineList: JudgeLine[]
    _highlighted: boolean
    _allNotes?: Note[]
    getAllNotes() {
        const notes: Note[] = [];
        this.judgeLineList.forEach(judgeLine => {
            notes.push(...judgeLine.notes);
        })
        return this._allNotes = notes;
    }
    highlightNotes() {
        if (!this._highlighted) {
            const allNotes = new Map<number, Note>();
            for (const judgeLine of this.judgeLineList) {
                for (const note of judgeLine.notes) {
                    const anotherNote = allNotes.get(getBeatsValue(note.startTime));
                    if (anotherNote) {
                        anotherNote._highlight = true;
                        note._highlight = true;
                    }
                    else {
                        allNotes.set(getBeatsValue(note.startTime), note);
                        note._highlight = false;
                    }
                }
            }
            this._highlighted = true;
        }
    }
    clearHitSound(seconds: number) {
        for (const judgeLine of this.judgeLineList) {
            for (const note of judgeLine.notes) {
                const { startSeconds, endSeconds } = note.caculateSeconds(this.BPMList);
                if (seconds < startSeconds)
                    note._hitState = HitState.NotHitted;
                else if (note.type == NoteType.Hold && seconds >= startSeconds && seconds < endSeconds)
                    note._hitState = HitState.HoldingPerfect;
                else
                    note._hitState = HitState.Perfect;
            }
        }
    }
    constructor(chart: unknown) {
        this.BPMList = [];
        this.META = {
            name: "Unknown",
            level: "SP Lv.?",
            offset: 0,
            charter: "Unknown",
            composer: "Unknown",
            illustrator: "Unknown"
        }
        this.judgeLineGroup = ["default"];
        this.judgeLineList = [];
        this._highlighted = false;

        if (isObject(chart)) {
            if ("BPMList" in chart && isArray(chart.BPMList)) for (const bpm of chart.BPMList) {
                const formatedBPM: BPM = {
                    bpm: 120,
                    startTime: [0, 0, 1]
                };
                if (isObject(bpm)) {
                    if ("bpm" in bpm && isNumber(bpm.bpm))
                        formatedBPM.bpm = bpm.bpm;
                    if ("startTime" in bpm && isArrayOf3Numbers(bpm.startTime))
                        formatedBPM.startTime = bpm.startTime;
                }
                this.BPMList.push(formatedBPM);
            }
            if ("META" in chart && isObject(chart.META)) {
                if ("name" in chart.META && isString(chart.META.name)) this.META.name = chart.META.name;
                if ("level" in chart.META && isString(chart.META.level)) this.META.level = chart.META.level;
                if ("offset" in chart.META && isNumber(chart.META.offset)) this.META.offset = chart.META.offset;
                if ("charter" in chart.META && isString(chart.META.charter)) this.META.charter = chart.META.charter;
                if ("composer" in chart.META && isString(chart.META.composer)) this.META.composer = chart.META.composer;
                if ("illustrator" in chart.META && isString(chart.META.illustrator)) this.META.illustrator = chart.META.illustrator;
            }
            if ("judgeLineGroup" in chart && isArray(chart.judgeLineGroup)) for (const group of chart.judgeLineGroup) {
                let formatedGroup = "default";
                if (isString(group)) {
                    formatedGroup = group;
                }
                this.judgeLineGroup.push(formatedGroup);
            }
            if ("judgeLineList" in chart && isArray(chart.judgeLineList)) for (const judgeLine of chart.judgeLineList) {
                this.judgeLineList.push(new JudgeLine(judgeLine));
            }
        }
    }
}