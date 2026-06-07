import type { TreeNode, SearchResult } from '@/types';

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightText(text: string, keyword: string): string {
  if (!keyword.trim()) return text;

  const escapedKeyword = escapeRegExp(keyword.trim());
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">$1</mark>');
}

export function searchTree<T extends TreeNode>(
  keyword: string,
  tree: T[],
  searchFields: Array<keyof T> = ['name']
): SearchResult {
  const matchedIds = new Set<string>();
  const expandedIds = new Set<string>();
  const lowerKeyword = keyword.trim().toLowerCase();

  if (!lowerKeyword) {
    return { matchedIds, expandedIds };
  }

  function traverse(node: T, path: string[]): boolean {
    let matched = false;
    for (const field of searchFields) {
      const value = node[field];
      if (typeof value === 'string' && value.toLowerCase().includes(lowerKeyword)) {
        matched = true;
        break;
      }
    }

    let childMatched = false;
    const currentPath = [...path, node.id];

    for (const child of node.children) {
      if (traverse(child as T, currentPath)) {
        childMatched = true;
      }
    }

    if (matched) {
      matchedIds.add(node.id);
      for (const id of path) {
        expandedIds.add(id);
      }
    }

    return matched || childMatched;
  }

  for (const root of tree) {
    traverse(root, []);
  }

  return { matchedIds, expandedIds };
}

export function searchTreeWithPath<T extends TreeNode>(
  keyword: string,
  tree: T[],
  searchFields: Array<keyof T> = ['name']
): { node: T; path: string[]; score: number }[] {
  const results: { node: T; path: string[]; score: number }[] = [];
  const lowerKeyword = keyword.trim().toLowerCase();

  if (!lowerKeyword) {
    return results;
  }

  function traverse(node: T, path: string[]): void {
    let score = 0;
    for (const field of searchFields) {
      const value = node[field];
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === lowerKeyword) {
          score += 100;
        } else if (lowerValue.startsWith(lowerKeyword)) {
          score += 50;
        } else if (lowerValue.includes(lowerKeyword)) {
          score += 10;
        }
      }
    }

    if (score > 0) {
      results.push({
        node,
        path: [...path, node.id],
        score,
      });
    }

    const currentPath = [...path, node.id];
    for (const child of node.children) {
      traverse(child as T, currentPath);
    }
  }

  for (const root of tree) {
    traverse(root, []);
  }

  return results.sort((a, b) => b.score - a.score);
}

export function fuzzySearch<T extends TreeNode>(
  keyword: string,
  tree: T[],
  searchFields: Array<keyof T> = ['name']
): SearchResult {
  const matchedIds = new Set<string>();
  const expandedIds = new Set<string>();
  const lowerKeyword = keyword.trim().toLowerCase();

  if (!lowerKeyword) {
    return { matchedIds, expandedIds };
  }

  const chars = lowerKeyword.split('');

  function fuzzyMatch(text: string): boolean {
    let charIndex = 0;
    for (const char of text.toLowerCase()) {
      if (char === chars[charIndex]) {
        charIndex++;
        if (charIndex === chars.length) return true;
      }
    }
    return false;
  }

  function traverse(node: T, path: string[]): boolean {
    let matched = false;
    for (const field of searchFields) {
      const value = node[field];
      if (typeof value === 'string' && fuzzyMatch(value)) {
        matched = true;
        break;
      }
    }

    let childMatched = false;
    const currentPath = [...path, node.id];

    for (const child of node.children) {
      if (traverse(child as T, currentPath)) {
        childMatched = true;
      }
    }

    if (matched) {
      matchedIds.add(node.id);
      for (const id of path) {
        expandedIds.add(id);
      }
    }

    return matched || childMatched;
  }

  for (const root of tree) {
    traverse(root, []);
  }

  return { matchedIds, expandedIds };
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
}

export function isKeywordInPath(
  text: string,
  keyword: string,
  caseSensitive = false
): boolean {
  if (!keyword.trim()) return false;
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchKeyword = caseSensitive ? keyword.trim() : keyword.trim().toLowerCase();
  return searchText.includes(searchKeyword);
}
