export function createCodeAdapter({read,write,test}={}){
 if(typeof read!=="function"||typeof write!=="function")throw new Error("sandbox code providers required");
 return {
  read,
  async write(path,content,{approvedSandbox=true}={}){
   if(!approvedSandbox)throw new Error("sandbox write not approved");
   return write(path,content);
  },
  async test(command){if(typeof test!=="function")throw new Error("test provider unavailable");return test(command);}
 };
}
