import assert from 'node:assert/strict';
import { buildGrowthProfile } from '../growth-profile.js';

const fixtures = [
  {
    id:'current-community',
    title:'社区志愿项目统筹',
    category:'领导力活动',
    date:'2026-05-20',
    description:'连续三周负责社区志愿者分工，协调小组完成儿童阅读角改造，最终向管理员提交项目报告。',
    files:[{ id:'report', name:'项目报告.pdf' }],
    photos:[]
  },
  {
    id:'current-ai',
    title:'Python 数据分析课程项目',
    category:'学术活动',
    date:'2026-03-10',
    description:'独立编写 Python 代码分析公开数据，发现异常值后改进模型，并完成可视化展示。',
    files:[],
    photos:[]
  },
  {
    id:'baseline-art',
    title:'校园戏剧节演出',
    category:'艺术活动',
    date:'2025-11-02',
    description:'和同学参与剧本改编与排练，最终按时完成舞台演出。',
    files:[],
    photos:[]
  }
];

const profile = buildGrowthProfile(fixtures, 2026, 2025);

assert.equal(profile.traits.length, 8, '应输出 8 个经历特质维度');
assert.equal(profile.domains.length, 8, '应输出 8 个认知边界维度');
assert.ok(profile.traits.every((trait) => trait.score >= 0 && trait.score <= 100), '特质分必须限制在 0-100');
assert.ok(profile.traits.find((trait) => trait.id === 'leadership').evidence.some((item) => item.record.id === 'current-community'), '领导力必须能追溯到来源记录');

const social = profile.domains.find((domain) => domain.id === 'social');
assert.equal(social.baseline, 0, '对比年无社会实践时积分应为 0');
assert.ok(social.current > 0, '当前年社会实践应有真实经历积分');
assert.ok(profile.newDomains.some((domain) => domain.id === 'social'), '去年为 0、今年大于 0 时应标记新拓展领域');

const secondRun = buildGrowthProfile(fixtures, 2026, 2025);
assert.deepEqual(secondRun, profile, '相同经历输入应得到完全一致的可复算结果');

const empty = buildGrowthProfile([], 2026, 2025);
assert.ok(empty.traits.every((trait) => trait.score === 0), '空经历库的特质分应全部为 0');
assert.ok(empty.domains.every((domain) => domain.current === 0 && domain.baseline === 0), '空经历库的年度积分应全部为 0');

console.log('Growth profile rules passed: traceability, year comparison, determinism, and empty state.');
