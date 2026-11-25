export enum PayUCommand {
  // Add other commands as needed, e.g., verify_payment, get_ws_context
  VERIFY_PAYMENT = 'verify_payment',
  CHECK_PAYMENT = 'check_payment',
  CANCEL_REFUND_TRANSACTION = 'cancel_refund_transaction',
  VALIDATE_VPA = 'validateVPA',
  UPI_MANDATE_STATUS = 'upi_mandate_status',
  PRE_DEBIT_SI = 'pre_debit_SI',
  SI_TRANSACTION = 'si_transaction',
  GET_TRANSACTION_DETAILS = 'get_Transaction_Details',
}

export enum PayUSubventionType {
  SI = 'SI',
}
