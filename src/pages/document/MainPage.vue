<template>
    <div class="content">
        <h1>Phigros 谱面文件文档</h1>
        <div class="notice">
            <em>该文档为<strong>非官方文档</strong>，部分内容仅为猜测不代表实际，如有问题欢迎指出</em>
            <em>注释：除特殊说明外，时间的格式都是三个元素的元组 [a, b, c]，表示第 (a + b / c) 拍</em>
        </div>
        <div class="attributes">
            <div>
                <h2>Chart.META</h2>
                <p>元数据，包括谱面基本信息</p>
            </div>
            <div>
                <h2>Chart.META.name</h2>
                <p>曲名（显示在界面左下方）</p>
            </div>
            <div>
                <h2>Chart.META.charter</h2>
                <p>谱师名字</p>
            </div>
            <div>
                <h2>Chart.META.composer</h2>
                <p>曲师名字</p>
            </div>
            <div>
                <h2>Chart.META.illustrator</h2>
                <p>画师名字</p>
            </div>
            <div>
                <h2>Chart.META.level</h2>
                <p>等级（显示在界面右下方）</p>
            </div>
            <div>
                <h2>Chart.META.offset</h2>
                <p>谱面偏移（单位为毫秒）</p>
            </div>
            <div>
                <h2>Chart.BPMList</h2>
                <p>BPM列表（变速曲会有多个BPM）</p>
            </div>
            <div>
                <h2>Chart.BPMList[].startTime</h2>
                <p>BPM的开始生效时间</p>
            </div>
            <div>
                <h2>Chart.BPMList[].bpm</h2>
                <p>BPM的值，表示每分钟拍数</p>
            </div>
            <div>
                <h2>Chart.judgeLineGroup</h2>
                <p>判定线组的列表（暂不知道有啥用）</p>
            </div>
            <div>
                <h2>Chart.judgeLineList</h2>
                <p>判定线列表，包含谱面所有的判定线</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].Group</h2>
                <p>判定线属于的组的编号（暂不知道有啥用）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].Name</h2>
                <p>判定线的名字（暂不知道有啥用）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].Texture</h2>
                <p>判定线的贴图（默认为line.png）</p>
                <p>贴图文件放在压缩包中</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].father</h2>
                <p>判定线的父线编号（取决于判定线在谱面文件中的顺序），判定线会以父线位置和方向建立坐标系后使用其坐标，默认为-1，表示使用舞台坐标系</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].zOrder</h2>
                <p>判定线的叠加顺序（越大则贴图越靠前）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].isCover</h2>
                <p>判定线的遮罩</p>
                <p>如果该属性为1，那么在判定线下方的note将不可见（假设该note下落方向为从上往下）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes</h2>
                <p>判定线上的note列表</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].type</h2>
                <p>note的种类（1=Tap, 2=Hold, 3=Flick, 4=Drag）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].startTime</h2>
                <p>note的开始时间</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].endTime</h2>
                <p>note的结束时间（只对Hold有效，其他note结束时间与开始时间相同）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].positionX</h2>
                <p>note相对于所在判定线的X坐标</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].above</h2>
                <p>note的方向，1表示从上往下落，0表示倒着落</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].isFake</h2>
                <p>note的真假，0表示真note，1表示假note（假note没有打击特效，不计入combo）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].alpha</h2>
                <p>note的透明度，0表示完全透明，255表示完全不透明</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].size</h2>
                <p>note的大小，1表示正常大小</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].speed</h2>
                <p>note的速度倍率，1表示直接使用判定线速度</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].visibleTime</h2>
                <p>note的可见时间，note会在被打击前visibleTime秒的时间内保持可见</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].notes[].yOffset</h2>
                <p>note的y轴偏移，note会在判定线上方yOffset像素的距离被打击</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].eventLayers</h2>
                <p>判定线上的普通事件层列表</p>
                <p>事件是分层的，一般来说有4层普通事件和1层特殊事件。判定线在某个时间点的某种事件值是把每个层的这种事件值加到一起得出来的</p>
                <p>事件也是分种类的，每种事件是很多个事件组成的列表。除特殊事件外，事件列表在某个时间点的值以下面的方式计算：</p>
                <p>如果该时间点下没有事件正在发生，那么值为该时间点之前最近的发生过的事件的结束值</p>
                <p>如果该时间点下有事件正在发生，那么值就要根据事件的开始值与结束值，通过缓动函数算出来此时的插值作为事件值</p>
                <p>谱面中不允许同一时间点有两个同层同类事件同时发生（即两个同层同类事件重叠）</p>
                <p>事件正在发生指事件开始时间 &le; 当前时间 &LT; 事件结束时间</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].eventLayers[].moveXEvents</h2>
                <p>事件层级的X坐标移动事件列表（屏幕X坐标范围为-675到675，比Scratch舞台范围大，Scratcher们可要注意了）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].eventLayers[].moveYEvents</h2>
                <p>事件层级的Y坐标移动事件列表（屏幕Y坐标范围为-450到450）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].eventLayers[].rotateEvents</h2>
                <p>事件层级的旋转事件列表（事件值为0表示判定线水平，事件值为正数表示顺时针旋转相应度数）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].eventLayers[].alphaEvents</h2>
                <p>事件层级的透明度事件列表（事件值为0表示完全透明，事件值为255表示完全不透明）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].eventLayers[].speedEvents</h2>
                <p>事件层级的速度事件列表</p>
                <p>速度为1表示其上的note每秒钟向下运动120像素（假设该note是从上往下落的），可以为负数，表示note向上运动，但不论如何note被打击时一定会落到判定线上</p>
            </div>
            <div>
                <h2>事件的bezier</h2>
                <p>是否使用贝塞尔曲线，1为是，0为否（暂不支持该属性）</p>
            </div>
            <div>
                <h2>事件的bezierPoints</h2>
                <p>贝塞尔曲线的控制点，为4个元素的列表（暂不支持该属性）</p>
            </div>
            <div>
                <h2>事件的easingType</h2>
                <p>缓动编号，为1到29之间的整数</p>
                <p>缓动编号从1到29所对应的缓动类型依次是：</p>
                <p>Linear,SineOut,SineIn,QuadOut,QuadIn,SineInOut,QuadInOut,CubicOut,CubicIn,QuartOut,QuartIn,CubicInOut,QuartInOut,QuintOut,QuintIn,ExpoOut,ExpoIn,CircOut,CircIn,BackOut,BackIn,CircInOut,BackInOut,ElasticOut,ElacticIn,BounceOut,BounceIn,BounceIO,ElasticIO</p>
                <p>其中Linear是线性函数，Sine是正弦函数，Quad是二次函数，Cubic是三次函数，Quart是四次函数，Quint是五次函数，Expo是指数函数，Circ是圆形函数，Back是掉头函数，Elastic是摇摆函数，Bounce是反弹函数</p>
                <p>Out表示逐渐减速，In表示逐渐加速，InOut表示先加速后减速</p>
                <p>缓动函数表示事件值随着时间变化而变化的关系，所有缓动函数在0处的值都为0（表示事件值未开始变化），在1处的值都为1（表示事件值变化完成）</p>
            </div>
            <div>
                <h2>事件的easingLeft</h2>
                <p>缓动曲线截取的左端点，默认为0，表示从开头开始截取</p>
            </div>
            <div>
                <h2>事件的easingRight</h2>
                <p>缓动曲线截取的右端点，默认为1，表示截取到结尾</p>
            </div>
            <div>
                <h2>事件的startTime</h2>
                <p>事件的开始时间</p>
            </div>
            <div>
                <h2>事件的endTime</h2>
                <p>事件的结束时间</p>
            </div>
            <div>
                <h2>事件的start</h2>
                <p>事件的开始值</p>
            </div>
            <div>
                <h2>事件的end</h2>
                <p>事件的结束值（文字事件暂不支持结束值与开始值不同）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].extended</h2>
                <p>判定线上的特殊事件层（只有一层）</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].extended.scaleXEvents</h2>
                <p>X轴缩放倍率事件列表，多用于有贴图或文字的判定线使其拉伸</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].extended.scaleYEvents</h2>
                <p>Y轴缩放倍率事件列表，多用于有贴图或文字的判定线使其拉伸</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].extended.colorEvents</h2>
                <p>颜色事件列表，控制判定线的颜色，事件值为3个元素的列表，表示rgb分量</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].extended.paintEvents</h2>
                <p>画笔事件列表，表示画笔粗细（暂不支持该属性，因为没几个人写谱用到这玩意的，应该是cmdysj自己发明出来的，我可不想支持）</p>
                <p>有了画笔事件之后判定线会变成画笔，不会再显示线，其他事件都会用来控制画笔（画笔形状为圆形，所以旋转事件对其无效），画笔事件值为负数表示清空该判定线的画板</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].extended.textEvents</h2>
                <p>文字事件列表，事件值为字符串，使用文字事件之后判定线会被指定的文字代替</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].extended.inclineEvents</h2>
                <p>倾斜事件列表，由于我不会做3D所以不支持</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].alphaControl</h2>
                <p>控制note到判定线的距离与note的透明度之间的关系，但是不支持该属性</p>
                <p>这玩意也没多大卵用，根本不想费时间支持alphaControl以及posControl，sizeControl，skewControl，yControl这些没用玩意</p>
            </div>
            <div>
                <h2>Chart.judgelineList[].bpmfactor</h2>
                <p>应用bpm列表的倍率，然鹅还是不支持</p>
            </div>
        </div>
    </div>
</template>
<script setup>

</script>
<style scoped>
em {
    color: red;
    font-style: normal;
    display: block;
}

.attributes {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.attributes>div {
    background: #eee;
    padding: 10px;
    border-radius: 8px;
    flex-grow: 1;
}

.notice {
    text-align: center;
}

h1 {
    text-align: center;
}

p {
    word-break: break-all;
}
</style>