export interface HiddenReply { keys: string[]; text: string; speaker?: string }
export interface BonusRing { when: number; text: string; speaker?: string }
export interface ChoiceOption { id: string; label: string; note: string; epilogue: string }

export type TourNode =
  | { type: 'narrative'; speaker?: string; text: string }
  | { type: 'input'; key: 'wish'; placeholder: string; hidden?: HiddenReply[] }
  | { type: 'tap'; target: number; rings: string[]; bonus?: BonusRing }
  | { type: 'choice'; options: ChoiceOption[] }
  | { type: 'settle'; relic: string; hint?: string }
  | { type: 'revisit'; text: string; speaker?: string }

export interface StationScript {
  stationId: number
  title: string
  nodes: TourNode[]
  /** 复访对白，key = 已选线 id（warm | mystery） */
  revisit?: Record<string, { text: string; speaker?: string }>
}

export const THREES_RINGS = [
  '第一声：愿你所想，皆有所归。',
  '第二声：愿你牵挂，都不必隐忍。',
  '第三声：愿这一愿，替你传到了。',
]

export const PINGAN_SCRIPT: StationScript = {
  stationId: 1,
  title: '平安钟楼 · 三声钟一人愿',
  nodes: [
    { type: 'narrative', text: '北山七处福气落锁，钥匙藏在同行人里。你的第一个落锁点，是这口平安钟。' },
    { type: 'narrative', speaker: '守钟人', text: '钟有三响。第一响，是替谁许的？' },
    {
      type: 'input',
      key: 'wish',
      placeholder: '写下你在乎的人，或想护的人',
      hidden: [
        { keys: ['妈妈'], speaker: '守钟人', text: '替你许给妈妈啊……钟声会轻些，怕惊着她。她也替你想过这一声，只是没说出口。' },
        { keys: ['爸爸', '父亲'], speaker: '守钟人', text: '山上的男人话少，愿更沉。这一声，钟替你替他，都记住了。' },
        { keys: ['自己'], speaker: '守钟人', text: '头一回见人替自己敲钟。北山有规矩——许给自己的愿，要还三年。想清楚了？' },
        { keys: ['平安'], speaker: '钟之回声', text: '平安二字，北山一年要收上千斤。可你这一声，钟楼记得住——因为你说的时候，顿了一下。' },
      ],
    },
    {
      type: 'tap',
      target: 3,
      rings: THREES_RINGS,
      bonus: {
        when: 4,
        speaker: '钟之回声',
        text: '第四声……这钟，多年没人敲出过第四声了。上一次，是七年前，有个戴眼镜的年轻人，敲完就走，落下了半张签纸。',
      },
    },
    { type: 'narrative', speaker: '钟之回声', text: '钟声把你的话带走了……只是，三响里混进了别人的第四声。这钟，曾被七个人敲出过七种下落。' },
    {
      type: 'choice',
      options: [
        {
          id: 'warm',
          label: '被护的人，终会被护住',
          note: '你信光，愿意替人传愿。钟声落定，暖意回响——却隐隐有第四声追随。',
          epilogue: '钟声最后一声落下，檐角的风铃跟着颤了颤。你写下的名字，此刻正被人稳稳护着。守钟人颔首：「字留钟上，愿落人心。去吧——关帝庙那位大爷，兴许知道下一把锁在哪儿。」',
        },
        {
          id: 'mystery',
          label: '替人护着的人，才最孤独',
          note: '你看见落锁之下的孤独。钟声落定，回响沉向关帝庙的方向。',
          epilogue: '钟声最后一声落下，却像有什么在钟腹里轻轻回敲了一下——第四声，不是你的。守钟人抬眼：「你听见了。」他把半张泛黄的签纸推过来：「关帝庙的老陈，等这个秘密，等了很多年。」',
        },
      ],
    },
    { type: 'settle', relic: '心愿絮条 · 第一声钟音', hint: '钟声的回响，隐隐沉向关帝庙——那里有位「话多的大爷」，逢人便讲他七年前遇见的一个敲钟人。' },
  ],
  revisit: {
    warm: { speaker: '守钟人', text: '又来了。钟上的字还在，替你记着。这一回——想再敲一声，还是给谁捎句话？' },
    mystery: { speaker: '守钟人', text: '为那第四声来的？老陈在关帝庙等你。他说，七年前那个人，走的时候回头看了钟楼三次。' },
  },
}

export const stationScripts: Record<string, StationScript> = { '1': PINGAN_SCRIPT }
