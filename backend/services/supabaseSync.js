const supabase = require('../supabase');

/**
 * Sync service to mirror all transactions, balance updates, and card operations
 * to the connected Supabase cloud database in real-time.
 */

async function syncTransaction(tx) {
  try {
    const { error } = await supabase.from('transactions').insert([{
      reference_id: tx.reference_id,
      user_id: tx.user_id,
      account_id: tx.account_id || null,
      card_id: tx.card_id || null,
      type: tx.type,
      total_amount: parseFloat(tx.total_amount),
      debit_portion: parseFloat(tx.debit_portion || 0),
      credit_portion: parseFloat(tx.credit_portion || 0),
      recipient_info: tx.recipient_info || null,
      description: tx.description || null,
      status: tx.status || 'SUCCESS',
      failure_reason: tx.failure_reason || null,
      parental_approval_id: tx.parental_approval_id || null,
      created_at: tx.created_at || new Date().toISOString()
    }]);

    if (error) {
      console.error('⚠️ Supabase transaction sync error:', error.message);
    } else {
      console.log(`📡 [Supabase Sync] Transaction ${tx.reference_id} mirrored to Supabase.`);
    }
  } catch (err) {
    console.error('⚠️ Supabase sync exception:', err.message);
  }
}

async function syncAccountBalance(accountId, newBalance) {
  try {
    const { error } = await supabase
      .from('accounts')
      .update({ balance: parseFloat(newBalance) })
      .eq('id', accountId);

    if (error) {
      console.error(`⚠️ Supabase account balance sync error (acc: ${accountId}):`, error.message);
    } else {
      console.log(`📡 [Supabase Sync] Account ${accountId} balance updated to ₹${newBalance} in Supabase.`);
    }
  } catch (err) {
    console.error('⚠️ Supabase syncAccountBalance exception:', err.message);
  }
}

async function syncCardAvailableCredit(cardId, newAvailableCredit) {
  try {
    const { error } = await supabase
      .from('hybrid_cards')
      .update({ available_credit: parseFloat(newAvailableCredit) })
      .eq('id', cardId);

    if (error) {
      console.error(`⚠️ Supabase card limit sync error:`, error.message);
    } else {
      console.log(`📡 [Supabase Sync] Card ${cardId} available credit updated to ₹${newAvailableCredit} in Supabase.`);
    }
  } catch (err) {
    console.error('⚠️ Supabase syncCardAvailableCredit exception:', err.message);
  }
}

async function syncCreateApprovalRequest(requestData) {
  try {
    const { data, error } = await supabase.from('parental_approval_requests').insert([{
      request_code: requestData.request_code,
      minor_user_id: requestData.minor_user_id,
      parent_user_id: requestData.parent_user_id,
      account_id: requestData.account_id,
      card_id: requestData.card_id || null,
      amount: parseFloat(requestData.amount),
      merchant: requestData.merchant,
      purpose: requestData.purpose || null,
      status: 'PENDING',
      expires_at: requestData.expires_at || new Date(Date.now() + 20 * 60 * 1000).toISOString()
    }]).select();

    if (error) {
      console.error('⚠️ Supabase approval request sync error:', error.message);
    } else {
      console.log(`📡 [Supabase Sync] Parental approval request ${requestData.request_code} pushed to Supabase.`);
      return data?.[0];
    }
  } catch (err) {
    console.error('⚠️ Supabase syncCreateApprovalRequest exception:', err.message);
  }
}

async function syncParentalApproval(requestCodeOrId, status, rejectionReason = null) {
  try {
    const query = typeof requestCodeOrId === 'string'
      ? supabase.from('parental_approval_requests').update({
          status,
          rejection_reason: rejectionReason,
          resolved_at: new Date().toISOString()
        }).eq('request_code', requestCodeOrId)
      : supabase.from('parental_approval_requests').update({
          status,
          rejection_reason: rejectionReason,
          resolved_at: new Date().toISOString()
        }).eq('id', requestCodeOrId);

    const { error } = await query;
    if (error) {
      console.error('⚠️ Supabase parental approval update error:', error.message);
    } else {
      console.log(`📡 [Supabase Sync] Parental request ${requestCodeOrId} marked ${status} in Supabase.`);
    }
  } catch (err) {
    console.error('⚠️ Supabase syncParentalApproval exception:', err.message);
  }
}

async function syncUser(user, passwordHash) {
  try {
    const userPayload = {
      name: user.name || 'Nexora Customer',
      email: user.email,
      role: user.role || 'CUSTOMER',
      dob: user.dob || null,
      phone: user.phone || null,
      status: user.status || 'ACTIVE'
    };
    if (passwordHash) {
      userPayload.password = passwordHash;
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', user.email).maybeSingle();
    let error;
    if (existing && existing.id) {
      const res = await supabase.from('users').update(userPayload).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('users').insert([userPayload]);
      error = res.error;
    }

    if (error) {
      console.warn('⚠️ Supabase user sync note:', error.message);
    } else {
      console.log(`📡 [Supabase Sync] User ${user.email} updated in Supabase cloud.`);
    }
  } catch (err) {
    console.warn('⚠️ Supabase syncUser exception:', err.message);
  }
}

module.exports = {
  syncTransaction,
  syncAccountBalance,
  syncCardAvailableCredit,
  syncCreateApprovalRequest,
  syncParentalApproval,
  syncUser
};
