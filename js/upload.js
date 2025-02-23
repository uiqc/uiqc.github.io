/**
 * @file 上传文件到 GitHub 的前端脚本
 */

"use strict";

/**
 * 立即执行函数，使用严格模式.
 */
(function() {

  // Password Modal Elements
  const passwordModal = document.getElementById('passwordModal');
  const passwordInput = document.getElementById('passwordInput');
  const passwordSubmit = document.getElementById('passwordSubmit');
  const passwordMessage = document.getElementById('passwordMessage');
  const appDiv = document.getElementById('app');

  let config = null; // Store decrypted config here

   /* 加密获得 encryptedConfig
      const password = '输入你的密码'; // Replace with a strong, unique password!  DO NOT HARDCODE THIS IN THE CLIENT-SIDE JS!

      const config = {
        owner: "uiqc",
        repo: "uiqc.github.io",
        branch: "main",
        githubToken: '输入你的 github key'
      };

      const encryptedConfig = {
        owner: CryptoJS.AES.encrypt(config.owner, password).toString(),
        repo: CryptoJS.AES.encrypt(config.repo, password).toString(),
        branch: CryptoJS.AES.encrypt(config.branch, password).toString(),
        githubToken: CryptoJS.AES.encrypt(config.githubToken, password).toString()
      };

      console.log(JSON.stringify(encryptedConfig, null, 2)); // Output the encrypted config
      */
  // Encrypted Configuration (Replace with your actual encrypted data)
  const encryptedConfig = {
    owner: "U2FsdGVkX19TiTir4No05DMZaXhNCAcEPFa1r1PP0p4=",
    repo: "U2FsdGVkX19iGpZydVY3h3rHXMbpcBWaVJz+2zq1th0=",
    branch: "U2FsdGVkX1/eshrq3g8u8oyhU+wNjG2wKVKB/t/KJp0=",
    githubToken: "U2FsdGVkX19taOv1jXauyOu4elsx+uoaRegxODqyE75ct4eFtIcKb5mLlBJ8howp9hTOkPay/oWv00PDez5RJUrh47Tsei3EIo/ONFjxwfF6Ue6+FzwnUyJmmXrHj2tbmsSJuWVDUmqm+7tV1ml+Uw=="
  }

  // Function to decrypt the config
  function decryptConfig(password) {
    try {
      const decryptedOwner = CryptoJS.AES.decrypt(encryptedConfig.owner, password).toString(CryptoJS.enc.Utf8);
      const decryptedRepo = CryptoJS.AES.decrypt(encryptedConfig.repo, password).toString(CryptoJS.enc.Utf8);
      const decryptedBranch = CryptoJS.AES.decrypt(encryptedConfig.branch, password).toString(CryptoJS.enc.Utf8);
      const decryptedGithubToken = CryptoJS.AES.decrypt(encryptedConfig.githubToken, password).toString(CryptoJS.enc.Utf8);

      // Check if decryption was successful (result is not empty)
      if (decryptedOwner && decryptedRepo && decryptedBranch && decryptedGithubToken) {
        return {
          owner: decryptedOwner,
          repo: decryptedRepo,
          branch: decryptedBranch,
          githubToken: decryptedGithubToken
        };
      } else {
        return null; // Decryption failed
      }
    } catch (error) {
      console.error("Decryption error:", error);
      return null; // Decryption failed
    }
  }


  // Check Password Function
  function checkPassword() {
    const enteredPassword = passwordInput.value;

    config = decryptConfig(enteredPassword);

    if (config) {
      passwordModal.style.display = 'none';
      appDiv.style.display = 'block'; // Show the app content
      initializeApp(); // Call function to set up the rest of the app
    } else {
      passwordMessage.textContent = "密码错误，请重试。";
    }
  }

  // Password Submit Event Listener
  passwordSubmit.addEventListener('click', checkPassword);

  // Allow "Enter" key to submit password in modal
  passwordInput.addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      passwordSubmit.click();
    }
  });

  // Show Password Modal on Page Load
  passwordModal.style.display = 'block';


  function initializeApp() {
    /**
     * 获取 DOM 元素.
     */
    const fileInput1 = document.getElementById('fileInput1');
    const fileInput2 = document.getElementById('fileInput2');
    const fileInput3 = document.getElementById('fileInput3');
    const fileInput4 = document.getElementById('fileInput4');
    const fileInput5 = document.getElementById('fileInput5');
    const uploadButton = document.getElementById('uploadButton');
    const messageDiv = document.getElementById('message');

    // 获取状态显示元素
    const statusElements = [
      document.getElementById('status1'),
      document.getElementById('status2'),
      document.getElementById('status3'),
      document.getElementById('status4'),
      document.getElementById('status5')
    ];

    const paths = [
      'excel/汽车类样品.xlsx',
      'excel/汽车类图纸目录表.xlsx',
      'excel/消费类样品.xlsx',
      'excel/IQC工程图纸登记表.xlsx',
      'excel/环保测试记录表.xlsx',
    ];


    /**
     * 上传按钮点击事件处理函数.
     */
    uploadButton.addEventListener('click', async () => {
      // 禁用上传按钮
      uploadButton.disabled = true;
      showMessage('上传中，请耐心等待...');


      /**
       * 获取文件列表.
       */
      const files = [
        fileInput1.files[0],
        fileInput2.files[0],
        fileInput3.files[0],
        fileInput4.files[0],
        fileInput5.files[0]
      ];

      const files_selected = files.filter(file => file); // 过滤掉未选择的文件

      // 检查是否选择了文件
      if (files_selected.length === 0) {
        showMessage('请至少选择一个文件。', 'error');
        uploadButton.disabled = false;
        return;
      }

      try {
        /**
         * 并行读取文件内容.
         */
        const fileContents = await Promise.all(
          files.map(file => (file ? readFileAsArrayBuffer(file) : Promise.resolve(null)))
        );

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file) continue; // 如果没有选择文件，则跳过

          const buffer = fileContents[i];
          if (!buffer) continue; // 如果没有读取到内容，则跳过（对应没有选择文件的情况）

          const path = paths[i] || file.name; // 使用默认文件名如果 paths 中没有对应路径
          // 构建 commit 消息
          const commitMessage = `doc: 上传 ${file.name} 去更新 excel 文件: ${path}`;
          
          statusElements[i].textContent = '查服务器';

          // Get the SHA before uploading
          let oldSha = null;
          try {
            oldSha = await getFileSha(config.owner, config.repo, path, config.githubToken);
            statusElements[i].textContent = '对比文件';
          } catch (error) {
            console.warn(`Could not get SHA for ${path}, might be a new file.`, error);
            statusElements[i].textContent = '没有旧文件';
          }

          const uploadResult = await uploadFile(config.owner, config.repo, config.branch, path, file, buffer, config.githubToken, commitMessage, oldSha);

          // Display the upload status
          if (statusElements[i]) {
            if (!oldSha) {
              statusElements[i].textContent = '第一次上传';
            } else if (uploadResult && uploadResult.content && uploadResult.content.sha === oldSha) {
              statusElements[i].textContent = '无需更新';
            } else {
              statusElements[i].textContent = '已经更新';
            }
          }
        }

        showMessage('文件上传完成！', 'success');

      } catch (error) {
        showMessage(`上传过程中发生错误：${error}`, 'error');
        console.error('上传错误:', error);
      } finally {
        // 无论成功或失败，都重新启用上传按钮
        uploadButton.disabled = false;
      }
    });

    /**
     * 异步读取文件内容为 ArrayBuffer.
     * @param {File} file 对象.
     * @return {Promise<ArrayBuffer>} 文件内容.
     */
    function readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result);
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file); // 读取为 ArrayBuffer
      });
    }


    /**
     * 获取文件的 SHA 值.
     * @param {string} owner GitHub 用户名.
     * @param {string} repo GitHub 仓库名.
     * @param {string} path 文件路径.
     * @param {string} token GitHub Personal Access Token.
     * @returns {Promise<string|null>} 文件的 SHA 值，如果文件不存在则返回 null.
     */
    async function getFileSha(owner, repo, path, token) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          return data.sha;
        } else if (response.status === 404) {
          return null; // 文件不存在
        } else {
          throw new Error(`获取文件 SHA 失败：${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.warn(`无法获取 ${path} 的 SHA 值，可能是新文件。`, error);
        return null; // 忽略错误，返回 null
      }
    }


    async function uploadFile(owner, repo, branch, path, file, buffer, token, commitMessage, oldSha) {
      try {

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

        const body = {
          message: commitMessage,
          content: arrayBufferToBase64(buffer),
          branch: branch
        };

        if (oldSha) {
          body.sha = oldSha; // Add the SHA if it exists (for updating existing files)
        }

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': file.type || 'application/octet-stream', // Set the correct file type
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to upload file: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log('File uploaded successfully:', data);
        return data; // Return the data from the upload

      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    }

    function arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }


    /**
     * 显示消息.
     * @param {string} message 消息内容.
     * @param {string} type 消息类型 (info, success, error).
     */
    function showMessage(message, type = 'info') {
      messageDiv.textContent = message;
      messageDiv.className = `message ${type}`; // 添加类型 class
    }
  }
})();
