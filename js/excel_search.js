// excel_search.js
/**
 * ExcelSearch 类，用于在浏览器端搜索 Excel 文件。
 *
 * 使用方法：
 * 1. 确保在 HTML 文件中引入 xlsx.full.min.js。
 * 2. 创建 ExcelSearch 实例: `const excelSearch = new ExcelSearch();`
 * 3. 调用 searchExcel 方法:
 * ```javascript
 * const url = 'your_excel_file.xlsx';
 * const searchValue = 'your_search_value';
 * const searchColumnNum = 2; // 料号在第3列（C列）, 从0开始计数所以是 2
 * const targetColumnArray = [0, 1, 3]; // 需要获取的列的索引 (A, B, D)
 *
 * excelSearch.searchExcel(url, searchValue, searchColumnNum, targetColumnArray)
 *   .then(results => {
 *     console.log('搜索结果:', results);
 *   })
 *   .catch(error => {
 *     console.error('搜索出错:', error);
 *   });
 * ```
 */
export class ExcelSearch {
  /**
   * 构造函数。检查 XLSX 库是否已加载，并初始化缓存和数据库信息。
   * @throws {Error} 如果 XLSX 库未加载。
   */
  constructor() {
    if (typeof window.XLSX === 'undefined') {
      throw new Error('XLSX 库未加载，请确保在 HTML 中引入 xlsx.full.min.js');
    }
    this.dbName = 'ExcelDB';
    this.storeName = 'ExcelFiles';
    this.workbookCache = new Map(); // 使用 Map 缓存 workbook 对象，key 为 URL
  }

  /**
   * 搜索 Excel 文件。
   * @param {string} url Excel 文件的 URL。
   * @param {string} searchValue 要搜索的值。
   * @param {number} searchColumnNum 要搜索的列的索引（从 0 开始）。
   * @param {number[]} targetColumnArray 要返回的列的索引数组（从 0 开始）。
   * @returns {Promise<Array<object>>} 包含搜索结果的 Promise。
   * @throws {Error} 如果发生任何错误。
   */
  async searchExcel(url, searchValue, searchColumnNum, targetColumnArray) {
    try {
      let workbook = this.workbookCache.get(url); // 1. 尝试从缓存中获取 workbook

      if (!workbook) {
        // 2. 如果缓存中没有，则从 IndexedDB 获取 Excel 文件
        let excelFile = await this.getExcelFileFromIndexedDB(url);

        // 3. 如果 IndexedDB 中没有，则下载并存储
        if (!excelFile) {
          excelFile = await this.downloadExcelFile(url);
          await this.storeExcelFileToIndexedDB(url, excelFile);
        }

        // 4. 解析 Excel 文件
        workbook = await this.parseExcelFile(excelFile);

        // 5. 缓存 workbook
        this.workbookCache.set(url, workbook);
      }

      // 6. 搜索 Excel 文件
      return this.searchWorkbook(workbook, searchValue, searchColumnNum, targetColumnArray);
    } catch (error) {
      console.error('搜索 Excel 文件时发生错误:', error);
      throw new Error(`搜索 Excel 文件时发生错误: ${error.message || error}`);
    }
  }

  /**
   * 从 IndexedDB 获取 Excel 文件。
   * @private
   * @param {string} url Excel 文件的 URL。
   * @returns {Promise<ArrayBuffer | null>} 包含 Excel 文件的 ArrayBuffer 的 Promise，如果文件不存在则返回 null。
   */
  async getExcelFileFromIndexedDB(url) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = (event) => {
        reject(`打开数据库失败: ${event.target.errorCode}`);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(this.storeName); // 如果不存在则创建对象仓库
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([this.storeName], 'readonly');
        const objectStore = transaction.objectStore(this.storeName);
        const getRequest = objectStore.get(url);

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null); // 如果文件不存在则返回 null
        };

        getRequest.onerror = (event) => {
          reject(`从 IndexedDB 获取文件失败: ${event.target.errorCode}`);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      };
    });
  }

  /**
   * 将 Excel 文件存储到 IndexedDB。
   * @private
   * @param {string} url Excel 文件的 URL。
   * @param {ArrayBuffer} fileData Excel 文件的 ArrayBuffer。
   * @returns {Promise<void>} 一个 Promise，在文件存储成功后 resolve。
   */
  async storeExcelFileToIndexedDB(url, fileData) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = (event) => {
        reject(`打开数据库失败: ${event.target.errorCode}`);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(this.storeName);
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);
        const putRequest = objectStore.put(fileData, url);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = (event) => {
          reject(`存储文件到 IndexedDB 失败: ${event.target.errorCode}`);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      };
    });
  }

  /**
   * 下载 Excel 文件。
   * @private
   * @param {string} url Excel 文件的 URL。
   * @returns {Promise<ArrayBuffer>} 包含 Excel 文件的 ArrayBuffer 的 Promise。
   * @throws {Error} 如果下载失败。
   */
  async downloadExcelFile(url) {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`下载文件失败: HTTP ${response.status} - ${response.statusText}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.error('下载 Excel 文件时发生错误:', error);
      throw new Error(`下载 Excel 文件时发生错误: ${error.message || error}`);
    }
  }

  /**
   * 解析 Excel 文件。
   * @private
   * @param {ArrayBuffer} fileData Excel 文件的 ArrayBuffer。
   * @returns {Promise<object>} 包含 Excel 数据的 workbook 对象的 Promise。
   * @throws {Error} 如果解析失败。
   */
  async parseExcelFile(fileData) {
    return new Promise((resolve, reject) => {
      try {
        const workbook = window.XLSX.read(new Uint8Array(fileData), { type: 'array' });
        if (!workbook.SheetNames.length) {
          return reject(new Error('Excel 文件没有工作表'));
        }
        resolve(workbook);
      } catch (error) {
        console.error('解析 Excel 文件时发生错误:', error);
        reject(new Error(`解析 Excel 文件时发生错误: ${error.message || error}`));
      }
    });
  }

  /**
   * 搜索 Excel workbook 对象。
   * @private
   * @param {object} workbook Excel workbook 对象。
   * @param {string} searchValue 要搜索的值。
   * @param {number} searchColumnNum 要搜索的列的索引（从 0 开始）。
   * @param {number[]} targetColumnArray 要返回的列的索引数组（从 0 开始）。
   * @returns {Array<object>} 包含搜索结果的数组。
   */
  searchWorkbook(workbook, searchValue, searchColumnNum, targetColumnArray) {
    const results = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      if (!sheet || !sheet['!ref']) {
        console.warn('Excel sheet 为空.');
        return; // 避免后续错误，直接返回
      }

      const range = window.XLSX.utils.decode_range(sheet['!ref']);

      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = window.XLSX.utils.encode_cell({ r: row, c: searchColumnNum });
        const cell = sheet[cellAddress];

        if (!cell) continue;

        const cellValue = cell.v;

        if (cellValue && String(cellValue).includes(searchValue)) {
          const result = {};
          targetColumnArray.forEach((colIndex) => {
            const targetCellAddress = window.XLSX.utils.encode_cell({ r: row, c: colIndex });
            const targetCell = sheet[targetCellAddress];
            result[colIndex] = targetCell ? String(targetCell.v || '') : '';
          });
          results.push(result);
        }
      }
    });
    return results;
  }

  /**
   * 根据 workbookCache 里的所有 key（文件 url），从服务器下载文件，更新保存到 indexedDB 和 workbookCache 里。
   * @returns {Promise<boolean>} 一个 Promise，在所有数据更新成功后 resolve 为 true， 否则 resolve 为 false。
   */
  async retainData(urlList) {
    let successCount = 0;
    let failCount = 0;
    for (const url of urlList) {
      // 1. 从服务器下载文件
      console.log(`开始更新文件：${url}`);
      try {
        const excelFile = await this.downloadExcelFile(url);
        // 2. 存储到 IndexedDB
        await this.storeExcelFileToIndexedDB(url, excelFile);
        // 3. 解析 Excel 文件
        const workbook = await this.parseExcelFile(excelFile);
        // 4. 更新缓存
        this.workbookCache.set(url, workbook);
        console.log(`成功更新文件：${url}`);
        successCount++;
      }
      catch (_) {
        failCount++;
      }
    }
    let result = "";
    if (failCount > 0) {
      result = '更新 Excel 文件出错数量：' + failCount;
    }
    return result;
  }
}
