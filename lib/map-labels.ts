import {Converter} from 'opencc-js/t2cn';

let simplify:ReturnType<typeof Converter>|undefined;
const hans=(value:string)=>(simplify??=Converter({from:'t',to:'cn'}))(value);
const aliases=(value:string)=>value.split(/[;；]/).map(v=>hans(v.trim())).filter(Boolean);
const clean=(value:string)=>aliases(value)[0]??'';

/** Prefer provider-supplied Chinese names; preserve official local spellings when none exist. */
export function simplifiedAddress(row:Record<string,unknown>):string {
  let display=typeof row.display_name==='string'?row.display_name:'';
  const names=row.namedetails as Record<string,unknown>|undefined;
  const preferred=names&&['name:zh-Hans','name:zh-CN','name:zh'].map(key=>names[key]).find(v=>typeof v==='string'&&v.trim());
  if(typeof preferred==='string'&&typeof row.name==='string'&&row.name)display=display.replace(row.name,clean(preferred));
  const parts=display.split(/[,，]/).map(clean).filter(Boolean);
  const address=row.address as Record<string,unknown>|undefined;
  if(address&&typeof address.country_code==='string'&&/^[a-z]{2}$/i.test(address.country_code)){
    const country=new Intl.DisplayNames(['zh-Hans'],{type:'region'}).of(address.country_code.toUpperCase());
    if(country){
      const previous=typeof address.country==='string'?clean(address.country):'';
      const index=parts.findIndex(part=>part===previous);
      if(index>=0)parts[index]=country;else if(!parts.includes(country))parts.push(country);
    }
  }
  return [...new Set(parts)].join('，');
}
