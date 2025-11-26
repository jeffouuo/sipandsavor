/**
 * 綠界金流支付提交函數 - Vue 版本
 * 
 * @param {Object} orderParams - 綠界金流訂單參數
 * @param {string} orderParams.MerchantID - 商店代號
 * @param {string} orderParams.MerchantTradeNo - 商店交易編號
 * @param {string} orderParams.MerchantTradeDate - 商店交易時間
 * @param {string} orderParams.PaymentType - 付款類型（通常為 'aio'）
 * @param {number} orderParams.TotalAmount - 交易金額
 * @param {string} orderParams.TradeDesc - 交易描述
 * @param {string} orderParams.ItemName - 商品名稱
 * @param {string} orderParams.ReturnURL - 回調 URL
 * @param {string} orderParams.OrderResultURL - 訂單結果 URL
 * @param {string} orderParams.ChoosePayment - 選擇的付款方式（'Credit' 表示信用卡）
 * @param {string} orderParams.EncryptType - 加密類型（通常為 '1'）
 * @param {string} orderParams.CheckMacValue - 檢查碼
 * @param {string} actionUrl - 綠界金流提交 URL（可選，預設為測試環境）
 * 
 * @example
 * const orderParams = {
 *   MerchantID: '3002607',
 *   MerchantTradeNo: 'EC1234567890',
 *   MerchantTradeDate: '2024/01/01 12:00:00',
 *   PaymentType: 'aio',
 *   TotalAmount: 1000,
 *   TradeDesc: '測試訂單',
 *   ItemName: '商品名稱',
 *   ReturnURL: 'https://yoursite.com/api/ecpay/return',
 *   OrderResultURL: 'https://yoursite.com/api/ecpay/result',
 *   ChoosePayment: 'Credit',
 *   EncryptType: '1',
 *   CheckMacValue: 'ABC123...'
 * };
 * 
 * submitToECPay(orderParams);
 */

/**
 * Vue 3 Composition API 版本
 */
export const useECPaySubmit = (orderParams, actionUrl = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5') => {
  import { watch, onUnmounted } from 'vue';

  let formElement = null;

  watch(
    () => orderParams,
    (newParams) => {
      if (!newParams || Object.keys(newParams).length === 0) {
        return;
      }

      // 清理舊表單
      if (formElement && formElement.parentNode) {
        formElement.parentNode.removeChild(formElement);
      }

      // 創建新表單
      formElement = createAndSubmitForm(newParams, actionUrl);
    },
    { immediate: true, deep: true }
  );

  onUnmounted(() => {
    if (formElement && formElement.parentNode) {
      formElement.parentNode.removeChild(formElement);
    }
  });
};

/**
 * Vue 2/3 通用函數版本 - 直接調用
 */
export const submitToECPay = (orderParams, actionUrl = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5') => {
  if (!orderParams || typeof orderParams !== 'object') {
    console.error('❌ 訂單參數格式錯誤');
    return;
  }

  // 驗證必要參數
  const requiredParams = ['MerchantID', 'MerchantTradeNo', 'MerchantTradeDate', 'TotalAmount', 'CheckMacValue'];
  const missingParams = requiredParams.filter(param => !orderParams[param]);
  
  if (missingParams.length > 0) {
    console.error('❌ 缺少必要參數:', missingParams);
    return;
  }

  return createAndSubmitForm(orderParams, actionUrl);
};

/**
 * 創建並提交表單的內部函數
 */
function createAndSubmitForm(orderParams, actionUrl) {
  try {
    // 創建表單
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl;
    form.style.display = 'none';
    form.id = 'ecpay-form-' + Date.now();

    // 添加所有參數到表單
    Object.keys(orderParams).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(orderParams[key]); // 確保值為字串
      form.appendChild(input);
    });

    // 將表單添加到 body
    document.body.appendChild(form);

    console.log('📤 提交綠界金流表單:', orderParams);
    
    // 自動提交表單
    form.submit();

    // 可選：提交後移除表單（但通常頁面會跳轉，所以可能不會執行）
    setTimeout(() => {
      if (form.parentNode) {
        form.parentNode.removeChild(form);
      }
    }, 1000);

    return form;
  } catch (error) {
    console.error('❌ 提交綠界金流表單失敗:', error);
    throw error;
  }
}

/**
 * Vue 3 Composition API 組件示例
 */
export const ECPaySubmitComposable = {
  setup(props) {
    const { orderParams, actionUrl } = props;
    
    useECPaySubmit(orderParams, actionUrl);
    
    return {};
  }
};

/**
 * Vue 2/3 組件示例（選項式 API）
 */
export const ECPaySubmitButton = {
  name: 'ECPaySubmitButton',
  props: {
    orderParams: {
      type: Object,
      required: true,
      validator: (value) => {
        const required = ['MerchantID', 'MerchantTradeNo', 'MerchantTradeDate', 'TotalAmount', 'CheckMacValue'];
        return required.every(param => value[param]);
      }
    },
    actionUrl: {
      type: String,
      default: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
    }
  },
  methods: {
    handleSubmit() {
      try {
        submitToECPay(this.orderParams, this.actionUrl);
      } catch (error) {
        this.$emit('error', error);
        console.error('提交失敗:', error);
      }
    }
  },
  template: `
    <button @click="handleSubmit" type="button">
      <slot>前往支付</slot>
    </button>
  `
};

/**
 * 使用示例 - Vue 3 Composition API
 * 
 * <template>
 *   <div>
 *     <button @click="handlePayment">前往支付</button>
 *   </div>
 * </template>
 * 
 * <script setup>
 * import { ref } from 'vue';
 * import { submitToECPay } from './ecpay-submit-vue.js';
 * 
 * const orderParams = ref(null);
 * 
 * const handlePayment = async () => {
 *   // 從後端獲取訂單參數
 *   const response = await fetch('/api/ecpay/create-order', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ items: [...] })
 *   });
 *   const data = await response.json();
 *   
 *   // 提交到綠界
 *   submitToECPay(data.params);
 * };
 * </script>
 */

/**
 * 使用示例 - Vue 3 Composition API (自動提交)
 * 
 * <template>
 *   <div v-if="orderParams">準備跳轉到支付頁面...</div>
 * </template>
 * 
 * <script setup>
 * import { ref, onMounted } from 'vue';
 * import { useECPaySubmit } from './ecpay-submit-vue.js';
 * 
 * const orderParams = ref(null);
 * 
 * onMounted(async () => {
 *   // 從後端獲取訂單參數
 *   const response = await fetch('/api/ecpay/create-order', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ items: [...] })
 *   });
 *   const data = await response.json();
 *   orderParams.value = data.params;
 * });
 * 
 * // 自動提交到綠界
 * useECPaySubmit(orderParams);
 * </script>
 */

/**
 * 使用示例 - Vue 2/3 選項式 API
 * 
 * <template>
 *   <div>
 *     <ECPaySubmitButton 
 *       :order-params="orderParams" 
 *       @error="handleError"
 *     >
 *       前往支付
 *     </ECPaySubmitButton>
 *   </div>
 * </template>
 * 
 * <script>
 * import { ECPaySubmitButton } from './ecpay-submit-vue.js';
 * 
 * export default {
 *   components: {
 *     ECPaySubmitButton
 *   },
 *   data() {
 *     return {
 *       orderParams: null
 *     };
 *   },
 *   async mounted() {
 *     // 從後端獲取訂單參數
 *     const response = await fetch('/api/ecpay/create-order', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ items: [...] })
 *     });
 *     const data = await response.json();
 *     this.orderParams = data.params;
 *   },
 *   methods: {
 *     handleError(error) {
 *       console.error('支付提交失敗:', error);
 *     }
 *   }
 * };
 * </script>
 */

