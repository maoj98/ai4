import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DepartmentNode } from '@/types';
import {
  escapeRegExp,
  highlightText,
  searchTree,
  searchTreeWithPath,
  fuzzySearch,
  debounce,
  throttle,
  isKeywordInPath,
} from '../searchUtils';

const createTestTree = (): DepartmentNode[] => [
  {
    id: '1',
    name: '技术部',
    code: 'TECH',
    parentId: null,
    level: 1,
    expanded: true,
    description: '负责技术研发',
    memberCount: 50,
    order: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: [
      {
        id: '1-1',
        name: '前端组',
        code: 'FE',
        parentId: '1',
        level: 2,
        expanded: false,
        description: '前端开发团队',
        memberCount: 20,
        order: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [
          {
            id: '1-1-1',
            name: 'React小组',
            code: 'REACT',
            parentId: '1-1',
            level: 3,
            expanded: false,
            description: 'React技术栈开发',
            memberCount: 10,
            order: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            children: [],
          },
          {
            id: '1-1-2',
            name: 'Vue小组',
            code: 'VUE',
            parentId: '1-1',
            level: 3,
            expanded: false,
            description: 'Vue技术栈开发',
            memberCount: 10,
            order: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            children: [],
          },
        ],
      },
      {
        id: '1-2',
        name: '后端组',
        code: 'BE',
        parentId: '1',
        level: 2,
        expanded: false,
        description: '后端开发团队',
        memberCount: 30,
        order: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [],
      },
    ],
  },
  {
    id: '2',
    name: '产品部',
    code: 'PROD',
    parentId: null,
    level: 1,
    expanded: true,
    description: '负责产品设计',
    memberCount: 20,
    order: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: [],
  },
];

describe('escapeRegExp', () => {
  it('应该正确转义正则表达式特殊字符', () => {
    expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('普通字符串不应该被修改', () => {
    expect(escapeRegExp('hello world')).toBe('hello world');
  });

  it('空字符串应该返回空', () => {
    expect(escapeRegExp('')).toBe('');
  });
});

describe('searchTree', () => {
  const tree = createTestTree();

  it('空关键词应该返回空结果', () => {
    const result = searchTree('', tree);
    expect(result.matchedIds.size).toBe(0);
    expect(result.expandedIds.size).toBe(0);
  });

  it('空白关键词应该返回空结果', () => {
    const result = searchTree('   ', tree);
    expect(result.matchedIds.size).toBe(0);
    expect(result.expandedIds.size).toBe(0);
  });

  it('精确匹配应该正确返回结果', () => {
    const result = searchTree('技术部', tree);
    expect(result.matchedIds.has('1')).toBe(true);
    expect(result.matchedIds.size).toBe(1);
    expect(result.expandedIds.size).toBe(0);
  });

  it('模糊匹配应该正确返回结果', () => {
    const result = searchTree('组', tree);
    expect(result.matchedIds.has('1-1')).toBe(true);
    expect(result.matchedIds.has('1-2')).toBe(true);
    expect(result.matchedIds.has('1-1-1')).toBe(true);
    expect(result.matchedIds.has('1-1-2')).toBe(true);
    expect(result.matchedIds.size).toBe(4);
  });

  it('大小写不敏感', () => {
    const result1 = searchTree('REACT', tree);
    const result2 = searchTree('react', tree);
    expect(result1.matchedIds).toEqual(result2.matchedIds);
    expect(result1.matchedIds.has('1-1-1')).toBe(true);
  });

  it('多字段搜索', () => {
    const result = searchTree('FE', tree, ['name', 'code']);
    expect(result.matchedIds.has('1-1')).toBe(true);
    expect(result.matchedIds.size).toBe(1);
  });

  it('搜索description字段', () => {
    const result = searchTree('技术研发', tree, ['name', 'description']);
    expect(result.matchedIds.has('1')).toBe(true);
  });

  it('自动展开匹配路径', () => {
    const result = searchTree('React小组', tree);
    expect(result.matchedIds.has('1-1-1')).toBe(true);
    expect(result.expandedIds.has('1')).toBe(true);
    expect(result.expandedIds.has('1-1')).toBe(true);
    expect(result.expandedIds.has('1-1-1')).toBe(false);
  });

  it('特殊字符应该被正确处理', () => {
    const specialTree: DepartmentNode[] = [
      {
        id: 's1',
        name: '测试(1)',
        code: 'T.1',
        parentId: null,
        level: 1,
        expanded: false,
        description: '包含特殊字符.*+?^${}()|[]\\',
        memberCount: 1,
        order: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [],
      },
    ];
    const result = searchTree('测试(1)', specialTree);
    expect(result.matchedIds.has('s1')).toBe(true);
  });

  it('搜索不到应该返回空结果', () => {
    const result = searchTree('不存在的部门', tree);
    expect(result.matchedIds.size).toBe(0);
    expect(result.expandedIds.size).toBe(0);
  });

  it('搜索code字段', () => {
    const result = searchTree('VUE', tree, ['code']);
    expect(result.matchedIds.has('1-1-2')).toBe(true);
    expect(result.matchedIds.size).toBe(1);
  });

  it('默认搜索name字段', () => {
    const result = searchTree('FE', tree);
    expect(result.matchedIds.size).toBe(0);
  });
});

describe('highlightText', () => {
  it('单个匹配项高亮', () => {
    const result = highlightText('技术部', '技术');
    expect(result).toBe('<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">技术</mark>部');
  });

  it('多个匹配项高亮', () => {
    const result = highlightText('技术部技术', '技术');
    expect(result).toBe(
      '<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">技术</mark>部<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">技术</mark>'
    );
  });

  it('无匹配时返回原文本', () => {
    const result = highlightText('技术部', '产品');
    expect(result).toBe('技术部');
  });

  it('空关键词返回原文本', () => {
    const result = highlightText('技术部', '');
    expect(result).toBe('技术部');
  });

  it('空白关键词返回原文本', () => {
    const result = highlightText('技术部', '   ');
    expect(result).toBe('技术部');
  });

  it('大小写不敏感高亮', () => {
    const result = highlightText('React', 'react');
    expect(result).toBe('<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">React</mark>');
  });

  it('关键词包含HTML特殊字符时应正确高亮', () => {
    const result = highlightText('<script>alert(1)</script>', '<script>');
    expect(result).toBe(
      '<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded"><script></mark>alert(1)</script>'
    );
  });

  it('特殊字符在关键词中应该被转义', () => {
    const result = highlightText('测试(1)', '(1)');
    expect(result).toBe('测试<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">(1)</mark>');
  });

  it('空文本应该返回空', () => {
    const result = highlightText('', '技术');
    expect(result).toBe('');
  });
});

describe('searchTreeWithPath', () => {
  const tree = createTestTree();

  it('空关键词应该返回空结果', () => {
    const result = searchTreeWithPath('', tree);
    expect(result.length).toBe(0);
  });

  it('精确匹配得分最高', () => {
    const result = searchTreeWithPath('技术部', tree);
    expect(result.length).toBe(1);
    expect(result[0].score).toBe(100);
    expect(result[0].node.id).toBe('1');
    expect(result[0].path).toEqual(['1']);
  });

  it('开头匹配得分次之', () => {
    const result = searchTreeWithPath('技术', tree);
    expect(result[0].node.id).toBe('1');
    expect(result[0].score).toBe(50);
  });

  it('包含匹配得分最低', () => {
    const result = searchTreeWithPath('部', tree);
    expect(result.every((r) => r.score === 10)).toBe(true);
  });

  it('结果按得分降序排列', () => {
    const multiMatchTree: DepartmentNode[] = [
      {
        id: 'a',
        name: '技术部',
        code: 'T',
        parentId: null,
        level: 1,
        expanded: false,
        description: '',
        memberCount: 1,
        order: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [
          {
            id: 'a1',
            name: '技术研发',
            code: 'TR',
            parentId: 'a',
            level: 2,
            expanded: false,
            description: '',
            memberCount: 1,
            order: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            children: [
              {
                id: 'a1-1',
                name: '前端技术',
                code: 'FT',
                parentId: 'a1',
                level: 3,
                expanded: false,
                description: '',
                memberCount: 1,
                order: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                children: [],
              },
            ],
          },
        ],
      },
    ];
    const result = searchTreeWithPath('技术', multiMatchTree);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
  });

  it('返回正确的路径', () => {
    const result = searchTreeWithPath('React小组', tree);
    expect(result.length).toBe(1);
    expect(result[0].path).toEqual(['1', '1-1', '1-1-1']);
  });
});

describe('fuzzySearch', () => {
  const tree = createTestTree();

  it('空关键词应该返回空结果', () => {
    const result = fuzzySearch('', tree);
    expect(result.matchedIds.size).toBe(0);
    expect(result.expandedIds.size).toBe(0);
  });

  it('模糊匹配按字符顺序匹配', () => {
    const result = fuzzySearch('技部', tree);
    expect(result.matchedIds.has('1')).toBe(true);
  });

  it('字符顺序不匹配不应该返回结果', () => {
    const result = fuzzySearch('部技', tree);
    expect(result.matchedIds.size).toBe(0);
  });

  it('自动展开匹配路径', () => {
    const result = fuzzySearch('Rt', tree);
    expect(result.matchedIds.has('1-1-1')).toBe(true);
    expect(result.expandedIds.has('1')).toBe(true);
    expect(result.expandedIds.has('1-1')).toBe(true);
  });

  it('大小写不敏感', () => {
    const result1 = fuzzySearch('RT', tree);
    const result2 = fuzzySearch('rt', tree);
    expect(result1.matchedIds).toEqual(result2.matchedIds);
    expect(result1.matchedIds.has('1-1-1')).toBe(true);
  });

  it('多字段模糊搜索', () => {
    const result = fuzzySearch('FE', tree, ['name', 'code']);
    expect(result.matchedIds.has('1-1')).toBe(true);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该延迟执行', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('多次调用只执行最后一次', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn(1);
    debouncedFn(2);
    debouncedFn(3);

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('取消防抖 - 新调用会重置计时器', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn(1);
    vi.advanceTimersByTime(200);

    debouncedFn(2);
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it('应该正确传递参数', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn('a', 'b', 'c');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith('a', 'b', 'c');
  });

  it('延迟为0时应该异步执行', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 0);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('首次调用应该立即执行', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 300);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('节流时间内多次调用只执行一次', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 300);

    throttledFn(1);
    throttledFn(2);
    throttledFn(3);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);

    vi.advanceTimersByTime(299);
    throttledFn(4);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    throttledFn(5);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(5);
  });

  it('应该正确传递参数', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 300);

    throttledFn('x', 'y', 'z');
    expect(fn).toHaveBeenCalledWith('x', 'y', 'z');
  });

  it('延迟为0时每次都执行', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 0);

    throttledFn(1);
    throttledFn(2);
    throttledFn(3);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('时间间隔足够时每次都执行', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 300);

    throttledFn(1);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    throttledFn(2);
    expect(fn).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(300);
    throttledFn(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('isKeywordInPath', () => {
  it('空关键词应该返回false', () => {
    expect(isKeywordInPath('技术部', '')).toBe(false);
    expect(isKeywordInPath('技术部', '   ')).toBe(false);
  });

  it('包含关键词应该返回true', () => {
    expect(isKeywordInPath('技术部', '技术')).toBe(true);
  });

  it('不包含关键词应该返回false', () => {
    expect(isKeywordInPath('技术部', '产品')).toBe(false);
  });

  it('默认大小写不敏感', () => {
    expect(isKeywordInPath('React', 'react')).toBe(true);
    expect(isKeywordInPath('react', 'REACT')).toBe(true);
  });

  it('大小写敏感模式', () => {
    expect(isKeywordInPath('React', 'react', true)).toBe(false);
    expect(isKeywordInPath('React', 'React', true)).toBe(true);
  });
});
