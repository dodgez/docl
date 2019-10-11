jmp start
label double:
  pop ax
  mul 2
  push ax
  ret
label start:
mov ax, 0x0C
push ax
call double
int 0
