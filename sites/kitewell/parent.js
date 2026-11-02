const socialFilters=[...document.querySelectorAll('[data-post-filter]')];
socialFilters.forEach(button=>button.addEventListener('click',()=>{
 const topic=button.dataset.postFilter;
 socialFilters.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
 const posts=[...document.querySelectorAll('#filtered-posts>[data-topic]')];
 posts.forEach(post=>post.hidden=topic!=='all'&&post.dataset.topic!==topic);
 const count=posts.filter(post=>!post.hidden).length;
 document.getElementById('post-filter-status').textContent=topic==='all'?`Showing all ${count} posts`:`Showing ${count} ${count===1?'post':'posts'} · ${button.textContent}`;
}));
