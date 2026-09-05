export type TourNode =
  | { type: 'narrative'; speaker?: string; text: string }
  | { type: 'input'; key: 'wish'; placeholder: string }
  | { type: 'tap'; target: number; rings: string[] }
  | { type: 'choice'; options: { id: string; label: string; note: string }[] }
  | { type: 'settle'; relic: string }

export interface StationScript {
  stationId: number
  title: string
  nodes: TourNode[]
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
    { type: 'input', key: 'wish', placeholder: '写下你在乎的人，或想护的人' },
    { type: 'tap', target: 3, rings: THREES_RINGS },
    { type: 'narrative', speaker: '钟之回声', text: '钟声把你的话带走了……只是，三响里混进了别人的第四声。这钟，曾被七个人敲出过七种下落。' },
    {
      type: 'choice',
      options: [
        { id: 'warm', label: '被护的人，终会被护住', note: '你信光，愿意替人传愿。钟声落定，暖意回响——却隐隐有第四声追随。' },
        { id: 'mystery', label: '替人护着的人，才最孤独', note: '你看见落锁之下的孤独。钟声落定，回响沉向关帝庙的方向。' },
      ],
    },
    { type: 'settle', relic: '心愿絮条 · 第一声钟音' },
  ],
}

export const stationScripts: Record<string, StationScript> = { '1': PINGAN_SCRIPT }