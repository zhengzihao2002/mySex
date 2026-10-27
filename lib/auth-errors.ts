type AuthError = {message?:string;status?:number;code?:string};
/** Forbidden can mean an untrusted origin; it is not proof of an unverified email. */
export function isUnverified(error:AuthError){
 return error.code==='EMAIL_NOT_VERIFIED' || /\bemail\b.{0,30}\bnot verified\b|\bverify your email\b/i.test(error.message??'');
}
