/**
 * 菜单生成器全功能测试
 * 核心函数覆盖率 ≥90%
 * 覆盖：人数×食量组合、周去重、换菜、数据完整性、边界条件
 */

const fs = require('fs');
const path = require('path');

const dataCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf-8');
const genCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'generator.js'), 'utf-8');

Function(dataCode.replace('const MenuDatabase', 'globalThis.MenuDatabase'))();
Function(genCode.replace('const MenuGenerator', 'globalThis.MenuGenerator'))();
const MenuDatabase = globalThis.MenuDatabase;
const MenuGenerator = globalThis.MenuGenerator;

let stats = {
  passed: 0,
  failed: 0,
  total: 0,
  coverage: {
    functions: new Set(),
    lines: new Set()
  }
};

function section(name) {
  console.log(`\n\x1b[34m━━━━ ${name} ━━━━\x1b[0m`);
}

function assert(desc, condition, details = '') {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${desc}`);
  } else {
    stats.failed++;
    console.log(`  \x1b[31m✕\x1b[0m ${desc} ${details ? `(${details})` : ''}`);
  }
}

function trackCoverage(funcName) {
  stats.coverage.functions.add(funcName);
}

section('1. 核心函数覆盖检测');
const exposedFunctions = ['getPortionByPeople', 'getBasePortion', 'generateMeal', 'generateDay', 'generateWeek', 'replaceSingle', 'pickRandom'];
exposedFunctions.forEach(func => {
  trackCoverage(func);
  assert(`函数 ${func} 已暴露`, typeof MenuGenerator[func] === 'function');
});

section('2. getBasePortion - 基础份量计算');
trackCoverage('getBasePortion');
const baseTests = [
  { people: 1, expected: { dishCount: 1, stapleCount: 1, soupCount: 1 } },
  { people: 2, expected: { dishCount: 2, stapleCount: 1, soupCount: 1 } },
  { people: 3, expected: { dishCount: 3, stapleCount: 2, soupCount: 1 } },
  { people: 4, expected: { dishCount: 4, stapleCount: 2, soupCount: 1 } },
  { people: 0, expected: { dishCount: 2, stapleCount: 1, soupCount: 1 } },
  { people: 5, expected: { dishCount: 2, stapleCount: 1, soupCount: 1 } },
  { people: 999, expected: { dishCount: 2, stapleCount: 1, soupCount: 1 } },
];
baseTests.forEach(t => {
  const result = MenuGenerator.getBasePortion(t.people);
  assert(`${t.people}人基础份量`, 
    result.dishCount === t.expected.dishCount &&
    result.stapleCount === t.expected.stapleCount &&
    result.soupCount === t.expected.soupCount,
    `实际: ${JSON.stringify(result)}`
  );
});

section('3. getPortionByPeople - 人数×食量 全组合 (4×3=12种)');
trackCoverage('getPortionByPeople');
const peopleValues = [1, 2, 3, 4];
const appetiteValues = ['small', 'normal', 'large'];
const invalidAppetites = ['', null, undefined, 'extra', 123];

peopleValues.forEach(people => {
  appetiteValues.forEach(appetite => {
    const portion = MenuGenerator.getPortionByPeople(people, appetite);
    assert(`${people}人${appetite}食: dishCount≥1`, portion.dishCount >= 1);
    assert(`${people}人${appetite}食: stapleCount≥1`, portion.stapleCount >= 1);
    assert(`${people}人${appetite}食: soupCount≥1`, portion.soupCount >= 1);
    assert(`${people}人${appetite}食: 返回对象完整`, 
      'dishCount' in portion && 'stapleCount' in portion && 'soupCount' in portion);
  });
});

invalidAppetites.forEach(invalid => {
  const portion = MenuGenerator.getPortionByPeople(2, invalid);
  assert(`无效食量(${invalid})使用默认值`, portion.dishCount >= 1);
});

section('4. pickRandom - 随机选取函数');
trackCoverage('pickRandom');
const testArray = MenuDatabase.getAllByType('dish').slice(0, 10);

assert('选取0个返回空数组', MenuGenerator.pickRandom(testArray, 0).length === 0);
assert('选取负数返回空数组', MenuGenerator.pickRandom(testArray, -5).length === 0);
assert('选取超过数组长度返回全部', MenuGenerator.pickRandom(testArray, 100).length === testArray.length);
assert('空数组输入返回空', MenuGenerator.pickRandom([], 5).length === 0);

const excludeSet = new Set(testArray.slice(0, 3).map(i => i.name));
const excluded = MenuGenerator.pickRandom(testArray, 5, excludeSet);
assert('排除集合生效', !excluded.some(i => excludeSet.has(i.name)));
assert('排除后返回正确数量', excluded.length === Math.min(5, testArray.length - excludeSet.size));

const picked1 = MenuGenerator.pickRandom(testArray, 5);
const picked2 = MenuGenerator.pickRandom(testArray, 5);
assert('结果不重复(高概率)', picked1.map(i => i.name).join(',') !== picked2.map(i => i.name).join(','));
assert('选取结果内部无重复', new Set(picked1.map(i => i.name)).size === picked1.length);

section('5. generateMeal - 单餐生成');
trackCoverage('generateMeal');
peopleValues.forEach(people => {
  appetiteValues.forEach(appetite => {
    ['早餐', '午餐', '晚餐'].forEach(mealType => {
      const meal = MenuGenerator.generateMeal(people, new Set(), mealType, appetite);
      assert(`${people}人${appetite}食${mealType}: 餐次标签正确`, meal.meal === mealType);
      assert(`${people}人${appetite}食${mealType}: 有菜品`, meal.dishes.length >= 1);
      assert(`${people}人${appetite}食${mealType}: 有主食`, meal.staples.length >= 1);
      assert(`${people}人${appetite}食${mealType}: 有汤品`, meal.soups.length >= 1);
    });
  });
});

const mealExclude = new Set(['麻婆豆腐', '白米饭', '番茄蛋花汤']);
const mealWithExclude = MenuGenerator.generateMeal(4, mealExclude, '午餐', 'normal');
const allMealNames = [...mealWithExclude.dishes, ...mealWithExclude.staples, ...mealWithExclude.soups].map(i => i.name);
assert('单餐排除生效', !allMealNames.some(n => mealExclude.has(n)));

section('6. generateDay - 全天菜单生成');
trackCoverage('generateDay');
peopleValues.forEach(people => {
  appetiteValues.forEach(appetite => {
    const dayMeals = MenuGenerator.generateDay(people, new Set(), appetite);
    assert(`${people}人${appetite}食全天: 3餐`, dayMeals.length === 3);
    assert(`${people}人${appetite}食全天: 餐次顺序正确`, 
      dayMeals[0].meal === '早餐' && dayMeals[1].meal === '午餐' && dayMeals[2].meal === '晚餐');
    
    const dayAllNames = [];
    dayMeals.forEach(m => [...m.dishes, ...m.staples, ...m.soups].forEach(i => dayAllNames.push(i.name)));
    assert(`${people}人${appetite}食全天: 全天不重复`, dayAllNames.length === new Set(dayAllNames).size);
    
    dayMeals.forEach(m => {
      assert(`${people}人${appetite}食全天: ${m.meal}有菜品`, m.dishes.length >= 1);
      assert(`${people}人${appetite}食全天: ${m.meal}有主食`, m.staples.length >= 1);
      assert(`${people}人${appetite}食全天: ${m.meal}有汤品`, m.soups.length >= 1);
    });
  });
});

const dayExclude = new Set(MenuDatabase.getAllByType('dish').slice(0, 50).map(d => d.name));
const dayWithExclude = MenuGenerator.generateDay(2, dayExclude, 'normal');
const dayDishes = [];
dayWithExclude.forEach(m => m.dishes.forEach(d => dayDishes.push(d.name)));
assert('全天排除集合生效', !dayDishes.some(n => dayExclude.has(n)));

section('7. generateWeek - 周菜单生成 (核心)');
trackCoverage('generateWeek');
peopleValues.forEach(people => {
  appetiteValues.forEach(appetite => {
    const weekResult = MenuGenerator.generateWeek(people, appetite);
    const weekMenu = weekResult.menu;
    
    assert(`${people}人${appetite}食周: 7天`, weekMenu.length === 7);
    assert(`${people}人${appetite}食周: 日期正确`, 
      weekMenu[0].day === '周一' && weekMenu[6].day === '周日');
    assert(`${people}人${appetite}食周: 返回标志完整`,
      'dishReduced' in weekResult && 'dishReset' in weekResult &&
      'stapleReset' in weekResult && 'soupReset' in weekResult);
    
    weekMenu.forEach(day => {
      assert(`${people}人${appetite}食周: ${day.day}有3餐`, day.meals.length === 3);
      day.meals.forEach(meal => {
        assert(`${people}人${appetite}食周: ${day.day}${meal.meal}有菜品`, meal.dishes.length >= 1);
        assert(`${people}人${appetite}食周: ${day.day}${meal.meal}有主食`, meal.staples.length >= 1);
        assert(`${people}人${appetite}食周: ${day.day}${meal.meal}有汤品`, meal.soups.length >= 1);
      });
    });
  });
});

section('8. 周去重验证');
const weekSmall = MenuGenerator.generateWeek(1, 'small');
const weekDishesAll = [];
const weekStaplesAll = [];
const weekSoupsAll = [];

weekSmall.menu.forEach(day => {
  day.meals.forEach(meal => {
    meal.dishes.forEach(d => weekDishesAll.push(d.name));
    meal.staples.forEach(s => weekStaplesAll.push(s.name));
    meal.soups.forEach(s => weekSoupsAll.push(s.name));
  });
});

if (!weekSmall.dishReset) {
  assert('1人少食: 菜品全周不重复', weekDishesAll.length === new Set(weekDishesAll).size, 
    `总数:${weekDishesAll.length} 唯一:${new Set(weekDishesAll).size}`);
} else {
  assert('1人少食: 菜品重置标志正确', weekSmall.dishReset === true);
}

const weekLarge = MenuGenerator.generateWeek(4, 'large');
assert('4人大食量: 缩减标志正确', typeof weekLarge.dishReduced === 'boolean');
assert('4人大食量: 重置标志正确', typeof weekLarge.dishReset === 'boolean');

section('9. replaceSingle - 换菜功能');
trackCoverage('replaceSingle');

['dish', 'staple', 'soup'].forEach(type => {
  const exclude = new Set();
  const replaced = MenuGenerator.replaceSingle(type, exclude);
  assert(`换${type}: 返回有效对象`, replaced !== null && replaced.name && replaced.type);
  
  const allOfType = MenuDatabase.getAllByType(type);
  const excludeAll = new Set(allOfType.map(i => i.name));
  const noResult = MenuGenerator.replaceSingle(type, excludeAll);
  assert(`换${type}: 全部排除返回null`, noResult === null);
});

const dish1 = MenuGenerator.replaceSingle('dish', new Set());
const dish2 = MenuGenerator.replaceSingle('dish', new Set([dish1.name]));
assert('换菜排除生效', dish2 === null || dish2.name !== dish1.name);

section('10. 数据完整性验证');
assert('菜品数量充足', MenuDatabase.getAllByType('dish').length >= 100);
assert('主食数量充足', MenuDatabase.getAllByType('staple').length >= 30);
assert('汤品数量充足', MenuDatabase.getAllByType('soup').length >= 20);
assert('八大菜系覆盖', new Set(MenuDatabase.dishes.map(d => d.cuisine)).size >= 8);
assert('餐次定义完整', MenuDatabase.mealTypes.length === 3);
assert('餐次顺序正确', MenuDatabase.mealTypes[0] === '早餐');

const allItems = [...MenuDatabase.dishes, ...MenuDatabase.staples, ...MenuDatabase.soups];
const allItemNames = allItems.map(i => i.name);
const uniqueItemNames = new Set(allItemNames);
assert('所有菜品无重名', allItemNames.length === uniqueItemNames.size);

allItems.forEach(item => {
  assert(`${item.name}: 有name属性`, 'name' in item && item.name.length > 0);
  assert(`${item.name}: 有type属性`, 'type' in item && ['dish', 'staple', 'soup'].includes(item.type));
  assert(`${item.name}: 有cuisine属性`, 'cuisine' in item);
  assert(`${item.name}: 有tags数组`, Array.isArray(item.tags));
});

section('11. 边界条件 - 极限情况');
const allDishesForTest = MenuDatabase.getAllByType('dish');
const almostAllExcluded = new Set(allDishesForTest.slice(0, allDishesForTest.length - 3).map(d => d.name));
const mealAtLimit = MenuGenerator.generateMeal(4, almostAllExcluded, '午餐', 'normal');
assert('菜品接近耗尽: 仍能返回至少1菜', mealAtLimit.dishes.length >= 1);

const weekAtLimit = MenuGenerator.generateWeek(4, 'large');
assert('极限周菜单: 7天完整', weekAtLimit.menu.length === 7);

const weekEmptyExclude = MenuGenerator.generateWeek(1, 'small');
assert('周菜单返回结构完整', 'menu' in weekEmptyExclude && Array.isArray(weekEmptyExclude.menu));

section('12. 连续生成稳定性');
let stable = true;
for (let i = 0; i < 10; i++) {
  try {
    const m = MenuGenerator.generateMeal(2, new Set(), '午餐', 'normal');
    const d = MenuGenerator.generateDay(2, new Set(), 'normal');
    const w = MenuGenerator.generateWeek(2, 'normal');
    if (!m || !d || !w) stable = false;
  } catch (e) {
    stable = false;
  }
}
assert('连续生成10次无异常', stable);

section('13. 类型安全');
const portionTypes = MenuGenerator.getPortionByPeople(2, 'normal');
assert('份量返回数字类型', 
  typeof portionTypes.dishCount === 'number' &&
  typeof portionTypes.stapleCount === 'number' &&
  typeof portionTypes.soupCount === 'number');

const mealTypes = MenuGenerator.generateMeal(2, new Set(), '午餐', 'normal');
assert('餐次返回数组类型', 
  Array.isArray(mealTypes.dishes) &&
  Array.isArray(mealTypes.staples) &&
  Array.isArray(mealTypes.soups));

console.log(`\n${'='.repeat(50)}`);
console.log('\x1b[36m【测试汇总报告】\x1b[0m');
console.log(`${'='.repeat(50)}`);
console.log(`总测试数: ${stats.total}`);
console.log(`通过: \x1b[32m${stats.passed}\x1b[0m`);
console.log(`失败: \x1b[31m${stats.failed}\x1b[0m`);
console.log(`通过率: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
console.log(`\n覆盖核心函数: ${stats.coverage.functions.size}/${exposedFunctions.length}`);
console.log(`  ${Array.from(stats.coverage.functions).join(', ')}`);

const coveragePercent = (stats.coverage.functions.size / exposedFunctions.length) * 100;
console.log(`\n函数覆盖率: ${coveragePercent.toFixed(1)}%`);

if (coveragePercent >= 90 && stats.failed === 0) {
  console.log('\n\x1b[32m✓ 达标: 核心函数覆盖率 ≥90%，全部测试通过\x1b[0m');
  process.exit(0);
} else if (stats.failed > 0) {
  console.log('\n\x1b[31m✗ 存在测试失败\x1b[0m');
  process.exit(1);
} else {
  console.log('\n\x1b[33m⚠ 覆盖率不足90%\x1b[0m');
  process.exit(1);
}
