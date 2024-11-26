export type RouteMapInfo = {
  pathKey?: string;
  id: string;
};

export class RouteMap {
  private keyMap: Map<string, RouteMapInfo> = new Map(); // 通过 path key 查找
  private idMap: Map<string, RouteMapInfo> = new Map(); // 通过 id 查找
  // 添加数据
  add(info: RouteMapInfo) {
    if (!info.pathKey && !info.id) {
      console.error('appKey 和 appId 不能同时为空');
      return;
    }
    this.keyMap.set(info.pathKey, info);
    if (info.id) {
      this.idMap.set(info.id, info);
    }
  }
  // 删除数据
  removeByKey(key: string) {
    const info = this.keyMap.get(key);
    if (info) {
      this.keyMap.delete(info.pathKey);
      this.idMap.delete(info.id);
      return true;
    }
    return false;
  }

  removeByAppId(appId: string) {
    const info = this.idMap.get(appId);
    if (info) {
      this.keyMap.delete(info.pathKey);
      this.idMap.delete(info.id);
      return true;
    }
    return false;
  }
  // 查询数据
  getByKey(key: string): RouteMapInfo | undefined {
    return this.keyMap.get(key);
  }
  getByAppId(appId: string): RouteMapInfo | undefined {
    return this.idMap.get(appId);
  }
}
