// index.js
'use strict';

import { ExcelSearch } from './excel_search.js';

const files = [
  'excel/汽车类样品.xlsx',
  'excel/汽车类图纸目录表.xlsx',
  'excel/消费类样品.xlsx',
  'excel/IQC工程图纸登记表.xlsx',
  'excel/环保测试记录表.xlsx',
];

// 主程序
class ExcelSearchApp {
  constructor() {
    this.form = document.getElementById('searchForm');
    this.input = document.getElementById('searchInput');
    this.status = document.getElementById('status');
    this.resultTableForAuto = document.getElementById('resultTableForAuto');
    this.resultCountForAuto = document.getElementById('resultCountForAuto');
    this.resultTable = document.getElementById('resultTable');
    this.resultCount = document.getElementById('resultCount');
    this.searcher = new ExcelSearch();

    this.initEventListeners();
  }

  initEventListeners() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSearch();
    });
    
    const retainDataBtn = document.getElementById('retainDataBtn');
    retainDataBtn.addEventListener('click', async () => {
      // 清除之前的进度和结果
      console.log("正在重新获取数据...");
      this.showStatus('正在获取最新数据...', 'loading');
      const data = this.searcher.retainData(files)
          .then((msg) => {
            if (msg.length > 0) {
              this.showStatus(msg, 'error');
            } else {
              this.showStatus('成功获取最新数据', 'success');
            }
          })
          .catch((error) => {
            this.showStatus(error, 'error');
          });
    });
  }

  async handleSearch() {
    const searchValue = this.input.value.trim();
    if (!searchValue) {
      this.showStatus('请输入查询编号', 'error');
      return;
    }

    this.showStatus('正在查询：送检报告', 'loading');
    this.clearResults();

    try {
      // 只要2025没有送检的都送检，不用再查 2024 年的
      let escapedFileUrl = this.escapeHtml(files[4]);
      let targetColumnArray = [0, 1, 3, 4, 5, 8, 9, 21, 22, 34, 35, 47, 48];
      // 注意： 材料名称 占 3 个列，
      // 每个季度送一次，往前翻最近一个季度的 送測日期 和 有效期(月）加起来，看今天是否已经过期
      // 序号	供应商	材料種類	料号	材料名称			可靠性实验编号	送測日期	有效期(月）	ROHS測試報告編號	下次測試日期	到期提醒
      // 44	鸿正	珍珠棉	710E0C500011R	珍珠棉			环保	2024/3/2	6	H20240304019	2024/9/2	-163		鸿正	珍珠棉	710E0C500011R	珍珠棉		环保	2024/8/7	3	H20240808016	2024/11/7	-97		鸿正	珍珠棉	710E0C500011R	珍珠棉		环保	2024/10/18	3	H20241019002	2025/1/18	-25		鸿正	珍珠棉	710E0C500011R	珍珠棉		环保	2025/1/10	3	H20250111001	2025/4/10	57
      const testResults = await this.searcher.searchExcel(escapedFileUrl, searchValue, 3, targetColumnArray);

      this.showStatus('正在查询：车载类.', 'loading');
      escapedFileUrl = this.escapeHtml(files[0]);
      targetColumnArray = [0, 1, 2, 6];
      // 序号	品名规格	物料编号	确认人	确认日期	有效日期	厂商	备注
      // 1	海绵胶粘带120*45*5MM	801M45020081A	吴土祥	2024.6.1	2025.6.1	光博士光电
      let sampleResults = await this.searcher.searchExcel(escapedFileUrl, searchValue, 2, targetColumnArray);

      this.showStatus('正在查询：车载类...', 'loading');
      escapedFileUrl = this.escapeHtml(files[1]);
      targetColumnArray = [0, 1, 2, 3];
      // 图纸序号	规格	料号	供应商	备注
      // 1（无零件图纸）	LVDS下铜壳	224041110061A	上海棱崎（JAE）	END-IQC-0042
      let drawingResults = await this.searcher.searchExcel(escapedFileUrl, searchValue, 2, targetColumnArray);
      const resultCountForAuto = this.displayResults(testResults, sampleResults, drawingResults, true);
      
      this.showStatus('正在查询：消费类.', 'loading');
      escapedFileUrl = this.escapeHtml(files[2]);
      targetColumnArray = [0, 1, 2, 6];
      //  序号 品名规格	物料编号	确认人	确认日期	有效日期	厂商	备注
      //  1	  USB A/M 三件式	206001950021A	吴土祥	2024.6.1	2025.6.1	旺昀
      sampleResults = await this.searcher.searchExcel(escapedFileUrl, searchValue, 2, targetColumnArray);

      this.showStatus('正在查询：消费类...', 'loading');
      escapedFileUrl = this.escapeHtml(files[3]);
      targetColumnArray = [0, 1, 2, 3];
      // 图纸序号	规格	料号	供应商	备注
      // 1	护套 	223000090020A/白色302000090011A无样品	鸿昌顺
      drawingResults = await this.searcher.searchExcel(escapedFileUrl, searchValue, 2, targetColumnArray);
      const resultCount = this.displayResults(testResults, sampleResults, drawingResults, false);
      
      const statusString = '车载类  ' + resultCountForAuto + '  个，消费类  ' + resultCount + '  个';
      this.showStatus('查询完成，找到：' + statusString, 'success');
    } catch (error) {
      this.showStatus(`查询出错: ${error.message}`, 'error');
      this.clearResults();
    }
  }

  convertCustomNumberToDate(customNumber) {
    /**
     * 将自定义数字转换为日期字符串（YYYY/MM/DD 格式）
     * @param {number|string} customNumber - 要转换的自定义数字
     * @returns {string} - 格式为 YYYY/MM/DD 的日期字符串，如果输入无效则返回 null
     */

    const number = parseInt(customNumber, 10); // 确保输入是数字
    if (isNaN(number)) {
      return null; // 或者抛出错误，根据你的需求
    }

    const baseDate = new Date(2024, 0, 1); // 2024/1/1 作为基准日期 (月份从 0 开始)
    const daysSinceBase = number - 45292; // 45292 是 2024/1/1 对应的数字

    const date = new Date(baseDate.getTime() + daysSinceBase * 24 * 60 * 60 * 1000);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始，需要加 1
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
  }

  overdue(dateNumberString, monthsToAdd) {
    /**
     * 比较给定日期（以自定义数字字符串表示）加上指定月数后是否达到或超过当前日期
     * @param {string} dateNumberString - 字符串类型的日期，以自定义数字表示
     * @param {string} monthsToAdd - 字符串类型的月数
     * @returns {string} - 如果达到或超过当前日期，返回 '是'，否则返回 '否'
     * 示例用法
     * const dateNumberString = "45653"; // 2024/12/27
     * const monthsToAdd = "3";
     * const result = this.overdue(dateNumberString, monthsToAdd);
     * console.log(result);
     */

    // 1. 将日期数字字符串转换为数字
    const dateNumber = parseInt(dateNumberString, 10);
    if (isNaN(dateNumber)) {
      return '无效的日期数字'; // 或者抛出错误，根据你的需求
    }

    // 2. 将自定义日期数字转换为 Date 对象
    const baseDate = new Date(2024, 0, 1); // 2024/1/1 作为基准日期
    const initialDate = new Date(baseDate.getTime() + (dateNumber - 45292) * 24 * 60 * 60 * 1000); // 45292 是 2024/1/1 对应的数字

    // 3. 将字符串类型的月数转换为数字
    const months = parseInt(monthsToAdd, 10);
    if (isNaN(months)) {
      return '无效的月数'; // 或者抛出错误，根据你的需求
    }

    // 4. 计算加上月数后的日期
    const futureDate = new Date(initialDate);
    futureDate.setMonth(initialDate.getMonth() + months);

    // 5. 获取当前日期（只包含年月日，不包含时分秒）
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();
    const simplifiedCurrentDate = new Date(currentYear, currentMonth, currentDay);

    // 6. 比较两个日期
    if (futureDate <= simplifiedCurrentDate) {
      return true;
    } else {
      return false;
    }
  }

  formatResults(testResults, sampleResults, drawingResults) {
    let results = [];
    if (sampleResults.length > 0) {
      // 找到样品，用样品来匹配图纸和送检
      sampleResults.forEach((element) => {
        if (element[2].length > 0) {
          let result = {};
          result.sampleNumber = element[0]; // 样品编号
          result.partName = element[1]; // 样品表的名字比较详细
          result.partNumber = element[2]; // 物料编号
          result.supplier = element[6]; // 供应商
          result.drawingNumber = '';
          result.needTest = '送';
          result.lastTestDate = '';
          result.testIntervalMonths = '';
          const upperCaseElement = element[2].toUpperCase();
          // 找图纸编号
          drawingResults.forEach((drawingElement) => {
            const upperCaseDrawingElement = drawingElement[2].toUpperCase();
            if (
              upperCaseElement === upperCaseDrawingElement ||
              upperCaseElement.includes(upperCaseDrawingElement) ||
              upperCaseDrawingElement.includes(upperCaseElement)
            ) {
              result.drawingNumber = drawingElement[0];
            }
          });
          testResults.forEach((testElement) => {
            const upperCaseTestElement = testElement[3].toUpperCase();
            if (
              upperCaseElement === upperCaseTestElement ||
              upperCaseElement.includes(upperCaseTestElement) ||
              upperCaseTestElement.includes(upperCaseElement)
            ) {
              // 最近一个季度的 送測日期 和 有效期(月）加起来，看今天是否已经过期
              // 8, 9, 21, 22, 34, 35, 47, 48
              let lastTestDate = '';
              if (testElement[47].length > 0) {
                lastTestDate = testElement[47];
              } else if (testElement[34].length > 0) {
                lastTestDate = testElement[34];
              } else if (testElement[21].length > 0) {
                lastTestDate = testElement[21];
              } else if (testElement[8].length > 0) {
                lastTestDate = testElement[8];
              }
              let testIntervalMonths = 3; // 默认3个月，以 excel 上有的为准
              if (lastTestDate.length > 0) {
                if (testElement[48].length > 0) {
                  testIntervalMonths = testElement[48];
                } else if (testElement[35].length > 0) {
                  testIntervalMonths = testElement[35];
                } else if (testElement[22].length > 0) {
                  testIntervalMonths = testElement[22];
                } else if (testElement[9].length > 0) {
                  testIntervalMonths = testElement[9];
                }
                if (this.overdue(lastTestDate, testIntervalMonths)) {
                  result.needTest = '送';
                } else {
                  result.needTest = '不';
                }
              }
              result.lastTestDate = this.convertCustomNumberToDate(lastTestDate);
              result.testIntervalMonths = testIntervalMonths;
            }
          });
          results.push(result);
        }
      });
    } else if (drawingResults.length > 0) {
      // 没有样品有图纸，用图纸来匹配送检
      drawingResults.forEach((drawingElement) => {
        if (drawingElement[2].length > 0) {
          let result = {};
          result.sampleNumber = ''; // 样品编号
          result.partName = drawingElement[1]; // 规格也就是物料的名字
          result.partNumber = drawingElement[2]; // 物料编号
          result.supplier = drawingElement[3]; // 供应商
          result.drawingNumber = drawingElement[0]; // 图纸序号
          result.needTest = '送';
          result.lastTestDate = '';
          result.testIntervalMonths = '';
          let upperCaseElement = drawingElement[2].toUpperCase();

          testResults.forEach((testElement) => {
            const upperCaseTestElement = testElement[3].toUpperCase();
            if (
              upperCaseElement === upperCaseTestElement ||
              upperCaseElement.includes(upperCaseTestElement) ||
              upperCaseTestElement.includes(upperCaseElement)
            ) {
              // 最近一个季度的 送測日期 和 有效期(月）加起来，看今天是否已经过期
              // 8, 9, 21, 22, 34, 35, 47, 48
              let lastTestDate = '';
              if (testElement[47].length > 0) {
                lastTestDate = testElement[47];
              } else if (testElement[34].length > 0) {
                lastTestDate = testElement[34];
              } else if (testElement[21].length > 0) {
                lastTestDate = testElement[21];
              } else if (testElement[8].length > 0) {
                lastTestDate = testElement[8];
              }
              let testIntervalMonths = 3; // 默认3个月，以 excel 上有的为准
              if (lastTestDate.length > 0) {
                if (testElement[48].length > 0) {
                  testIntervalMonths = testElement[48];
                } else if (testElement[35].length > 0) {
                  testIntervalMonths = testElement[35];
                } else if (testElement[22].length > 0) {
                  testIntervalMonths = testElement[22];
                } else if (testElement[9].length > 0) {
                  testIntervalMonths = testElement[9];
                }
                if (this.overdue(lastTestDate, testIntervalMonths)) {
                  result.needTest = '送';
                } else {
                  result.needTest = '不';
                }
              }
              result.lastTestDate = this.convertCustomNumberToDate(lastTestDate);
              result.testIntervalMonths = testIntervalMonths;
            }
          });
          results.push(result);
        }
      });
    }
    return results;
  }

  displayResults(testResults, sampleResults, drawingResults, forAuto) {
    /*
     * 返回显示的行数
     */
    let results = this.formatResults(testResults, sampleResults, drawingResults);
    results.forEach((result) => {
      // 创建一个表格行
      const row = document.createElement('tr');
      let intervalMounts = this.escapeHtml(result.testIntervalMonths);
      if (intervalMounts.length > 0) {
        intervalMounts += '个月';
      }
      row.innerHTML += `
              <td>${this.escapeHtml(result.partNumber)}</td>
              <td>${this.escapeHtml(result.needTest)}</td>
              <td>${this.escapeHtml(result.sampleNumber)}</td>
              <td>${this.escapeHtml(result.drawingNumber)}</td>
              <td>${this.escapeHtml(result.partName)}</td>
              <td>${this.escapeHtml(result.supplier)}</td>
              <td>${this.escapeHtml(result.lastTestDate)}</td>
              <td>${intervalMounts} </td>
          `;
      if (forAuto) {
        this.resultTableForAuto.appendChild(row);
        this.resultCountForAuto.textContent = '车载类：' + results.length + ' 个';
      } else {
        this.resultTable.appendChild(row);
        this.resultCount.textContent = '消费类：' + results.length + ' 个';
      }
    });
    return results.length;
  }

  clearResults() {
    this.resultTableForAuto.innerHTML = '';
    this.resultCountForAuto.textContent = '车载类：0 个';
    this.resultTable.innerHTML = '';
    this.resultCount.textContent = '消费类：0 个';
  }

  showStatus(message, type) {
    this.status.textContent = message;
    this.status.className = `status ${type}`;
  }

  escapeHtml(unsafe) {
    return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}

// 当 DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new ExcelSearchApp();
});
